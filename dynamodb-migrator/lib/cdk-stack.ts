import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { BillingMode, Table, AttributeType } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import {
  LambdaInvoke,
  DynamoPutItem,
  DynamoAttributeValue,
} from 'aws-cdk-lib/aws-stepfunctions-tasks';
import {
  Fail,
  Succeed,
  Choice,
  Condition,
  StateMachine,
  JsonPath,
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
      JsonPath.executionId,
    ),
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

    const runMigrationsJob = new LambdaInvoke(this, 'RunMigrationJob', {
      lambdaFunction: migrationLambdaFunction,
      resultSelector: {
        'payload.$': '$.Payload',
        'status.$': '$.Payload.status',
      },
      resultPath: '$.migrationResponse',
    });

    // Success
    const successBranch = new DynamoPutItem(this, 'MigrationSuccess', {
      table: this.versioning.table,
      item: {
        [this.versioning.partitionKeyName]: DynamoAttributeValue.fromString(
          this.versioning.migrationPartitionKey,
        ),
        [this.versioning.sortKeyName]:
          DynamoAttributeValue.fromString('CURRENT_STATUS'),
        status: DynamoAttributeValue.fromString('SUCCEEDED'),
        // targetVersion must be casted to a string when calling DynamoDB
        version: DynamoAttributeValue.numberFromString(
          JsonPath.format('{}', JsonPath.stringAt('$.targetVersion')),
        ),
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
      .next(new Succeed(this, 'MigrationSucceeded'));

    // Failure
    const jobFailed = new DynamoPutItem(this, 'MigrationFailure', {
      table: this.versioning.table,
      item: {
        [this.versioning.partitionKeyName]: DynamoAttributeValue.fromString(
          this.versioning.migrationPartitionKey,
        ),
        [this.versioning.sortKeyName]:
          DynamoAttributeValue.fromString('STATUS'),
        value: DynamoAttributeValue.fromString('FAILED'),
        metadata: getMetadata(),
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
            version: DynamoAttributeValue.numberFromString(
              JsonPath.format('{}', JsonPath.stringAt('$.targetVersion')),
            ),
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

    const definition = runMigrationsJob.next(
      new Choice(this, 'IsMigrationComplete')
        .when(
          Condition.stringEquals('$.migrationResponse.status', 'SUCCEEDED'),
          successBranch,
        )
        .otherwise(jobFailed),
    );

    new StateMachine(this, 'RunMigrationsStateMachine', {
      definition,
      timeout: Duration.minutes(5),
    });
  }
}
