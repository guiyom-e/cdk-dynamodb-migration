import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { BillingMode, Table, AttributeType } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import {
  LambdaInvoke,
  DynamoPutItem,
  DynamoAttributeValue,
  DynamoGetItem,
  DynamoUpdateItem,
} from 'aws-cdk-lib/aws-stepfunctions-tasks';
import {
  Fail,
  Succeed,
  Choice,
  Condition,
  StateMachine,
  JsonPath,
  ChainDefinitionBody,
} from 'aws-cdk-lib/aws-stepfunctions';

const getMetadata = () =>
  DynamoAttributeValue.fromMap({
    date: DynamoAttributeValue.fromString(JsonPath.stateEnteredTime),
    stateMachineId: DynamoAttributeValue.fromString(JsonPath.stateMachineId),
    startedAt: DynamoAttributeValue.fromString(JsonPath.executionStartTime),
  });

const getVersionSortKey = () =>
  DynamoAttributeValue.fromString(
    JsonPath.format(
      'VERSION_{}#{}#{}',
      JsonPath.stringAt('$.targetVersion'),
      JsonPath.executionStartTime,
      JsonPath.uuid(),
    ),
  );

const getTargetVersionForDynamoDb = () =>
  DynamoAttributeValue.numberFromString(
    // targetVersion must be casted to a string when calling DynamoDB
    JsonPath.jsonToString(JsonPath.numberAt('$.targetVersion')),
  );

interface TableMigration {
  type: 'table';
  table: Table;
}

interface GenericMigration {
  type: 'generic';
}

type Migration = TableMigration | GenericMigration;

type VersioningSettings = {
  table: Table;
  partitionKeyName: string;
  sortKeyName: string;
  migrationPartitionKey: string;
};

type MigrationStackProps = StackProps &
  Migration & {
    migrationLambdaFunction: IFunction;
    settings?: {
      versioning?: Partial<VersioningSettings>;
    };
  };

const PARTITION_KEY_NAME = 'pk';
const SORT_KEY_NAME = 'sk';
const MIGRATION_PARTITION_KEY = '_migration';
export class MigrationStack extends Stack {
  public versioning: VersioningSettings;

  constructor(scope: Construct, id: string, props: MigrationStackProps) {
    super(scope, id, props);
    const { migrationLambdaFunction, settings } = props;

    // Versioning
    const versioningPartitionKey =
      settings?.versioning?.partitionKeyName ?? PARTITION_KEY_NAME;
    const versioningSortKey =
      settings?.versioning?.sortKeyName ?? SORT_KEY_NAME;
    const versioningTable =
      settings?.versioning?.table ??
      new Table(this, 'VersioningTable', {
        partitionKey: {
          name: versioningPartitionKey,
          type: AttributeType.STRING,
        },
        sortKey: {
          name: versioningSortKey,
          type: AttributeType.STRING,
        },
        billingMode: BillingMode.PAY_PER_REQUEST,
      });
    this.versioning = {
      table: versioningTable,
      partitionKeyName: versioningPartitionKey,
      sortKeyName: versioningSortKey,
      migrationPartitionKey:
        settings?.versioning?.migrationPartitionKey ?? MIGRATION_PARTITION_KEY,
    };

    // Run Migration
    const runMigrationsJob = new LambdaInvoke(this, 'RunMigrationJob', {
      lambdaFunction: migrationLambdaFunction,
      resultSelector: {
        'payload.$': '$.Payload',
        'status.$': '$.Payload.status',
      },
      resultPath: '$.migrationResponse',
    });

    // Success
    const success = new Succeed(this, 'MigrationSucceeded');
    const successBranch = new DynamoPutItem(this, 'MigrationSuccess', {
      table: this.versioning.table,
      item: {
        [this.versioning.partitionKeyName]: DynamoAttributeValue.fromString(
          this.versioning.migrationPartitionKey,
        ),
        [this.versioning.sortKeyName]:
          DynamoAttributeValue.fromString('CURRENT_STATUS'),
        status: DynamoAttributeValue.fromString('SUCCEEDED'),
        version: getTargetVersionForDynamoDb(),
        metadata: getMetadata(),
      },
      resultPath: '$.dynamoResponse',
    });
    successBranch
      .next(
        new DynamoPutItem(this, 'SetHistoryOnSuccess', {
          table: this.versioning.table,
          item: {
            [this.versioning.partitionKeyName]: DynamoAttributeValue.fromString(
              this.versioning.migrationPartitionKey,
            ),
            [this.versioning.sortKeyName]: getVersionSortKey(),
            status: DynamoAttributeValue.fromString('SUCCEEDED'),
            // targetVersion must be casted to a string when calling DynamoDB
            version: DynamoAttributeValue.numberFromString(
              JsonPath.format('{}', JsonPath.stringAt('$.targetVersion')),
            ),
            metadata: getMetadata(),
          },
        }),
      )
      .next(success);

    // Failure
    const jobFailed = new DynamoUpdateItem(this, 'MigrationFailure', {
      table: this.versioning.table,
      key: {
        [this.versioning.partitionKeyName]: DynamoAttributeValue.fromString(
          this.versioning.migrationPartitionKey,
        ),
        [this.versioning.sortKeyName]:
          DynamoAttributeValue.fromString('CURRENT_STATUS'),
      },
      updateExpression: 'SET #status = :status, #metadata = :metadata',
      expressionAttributeNames: {
        '#status': 'status',
        '#metadata': 'metadata',
      },
      expressionAttributeValues: {
        ':status': DynamoAttributeValue.fromString('FAILED'),
        ':metadata': getMetadata(),
      },
      resultPath: '$.dynamoResponse',
    });
    jobFailed
      .next(
        new DynamoPutItem(this, 'SetHistoryOnFailure', {
          table: this.versioning.table,
          item: {
            [this.versioning.partitionKeyName]: DynamoAttributeValue.fromString(
              this.versioning.migrationPartitionKey,
            ),
            [this.versioning.sortKeyName]: getVersionSortKey(),
            status: DynamoAttributeValue.fromString('FAILED'),
            // targetVersion must be casted to a string when calling DynamoDB
            version: getTargetVersionForDynamoDb(),
            metadata: getMetadata(),
          },
        }),
      )
      .next(
        new Fail(this, 'MigrationFailed', {
          cause: 'See RunMigrationJob for details',
          error: 'Migration Failed',
        }),
      );

    runMigrationsJob.next(
      new Choice(this, 'IsMigrationComplete')
        .when(
          Condition.stringEquals('$.migrationResponse.status', 'SUCCEEDED'),
          successBranch,
        )
        .otherwise(jobFailed),
    );

    // Check migration version
    const definition = new DynamoPutItem(this, 'SetupFirstVersion', {
      table: this.versioning.table,
      item: {
        [this.versioning.partitionKeyName]: DynamoAttributeValue.fromString(
          this.versioning.migrationPartitionKey,
        ),
        [this.versioning.sortKeyName]:
          DynamoAttributeValue.fromString('CURRENT_STATUS'),
        status: DynamoAttributeValue.fromString('NOT_RUN'),
        version: DynamoAttributeValue.numberFromString('0'),
        metadata: getMetadata(),
      },
      conditionExpression: 'attribute_not_exists(#version)',
      expressionAttributeNames: {
        '#version': 'version',
      },
      resultPath: '$.dynamoResponse',
    });

    const shouldRunMigration = new DynamoGetItem(this, 'GetCurrentVersion', {
      table: this.versioning.table,
      key: {
        [this.versioning.partitionKeyName]: DynamoAttributeValue.fromString(
          this.versioning.migrationPartitionKey,
        ),

        [this.versioning.sortKeyName]:
          DynamoAttributeValue.fromString('CURRENT_STATUS'),
      },
      resultSelector: {
        // Item.version.N must be casted to a number
        value: JsonPath.stringToJson(JsonPath.stringAt('$.Item.version.N')),
        '_dynamoResponse.$': '$',
      },
      resultPath: '$.currentVersion',
    }).next(
      new Choice(this, 'ShouldRunMigration')
        .when(
          Condition.and(
            Condition.isNumeric('$.targetVersion'),
            Condition.isNumeric('$.currentVersion.value'),
            Condition.numberGreaterThanJsonPath(
              '$.targetVersion',
              '$.currentVersion.value',
            ),
          ),
          runMigrationsJob,
        )
        .otherwise(success),
    );

    definition.addCatch(shouldRunMigration, {
      errors: ['DynamoDB.ConditionalCheckFailedException'],
      resultPath: '$.dynamoResponse',
    });

    definition.next(shouldRunMigration);

    new StateMachine(this, 'RunMigrationsStateMachine', {
      definitionBody: ChainDefinitionBody.fromChainable(definition),
      timeout: Duration.minutes(5),
    });
  }
}
