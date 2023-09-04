import { Duration, StackProps } from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import {
  ChainDefinitionBody,
  Choice,
  Condition,
  Fail,
  JsonPath,
  StateMachine,
  Succeed,
} from 'aws-cdk-lib/aws-stepfunctions';
import {
  DynamoAttributeValue,
  DynamoGetItem,
  DynamoPutItem,
  DynamoUpdateItem,
  LambdaInvoke,
} from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';

import {
  CURRENT_STATUS_SORT_KEY,
  DEFAULT_MIGRATION_PARTITION_KEY,
  DEFAULT_PARTITION_KEY_NAME,
  DEFAULT_SORT_KEY_NAME,
  FAILURE_STATUS,
  SUCCESS_STATUS,
} from '../constants';
import {
  getMetadata,
  getTargetVersionForDynamoDb,
  getVersionSortKey,
} from '../helpers/dynamodb';

/** @todo */
interface TableMigration {
  type: 'table';
  table: Table;
}

/** @todo */
interface GenericMigration {
  type: 'generic';
}

type Migration = TableMigration | GenericMigration;

/** Versioning settings of MigrationConstruct */
export type VersioningSettings = {
  /** DynamoDB table to store migration state and versions */
  table: Table;
  /** Partition key name of the versioning table */
  partitionKeyName: string;
  /** Sort key name of the versioning table */
  sortKeyName: string;
  /** Partition key value to use for the versioning purpose */
  migrationPartitionKey: string;
};

/** MigrationConstruct props */
export type MigrationConstructProps = StackProps &
  Migration & {
    migrationLambdaFunction: IFunction;
    settings?: {
      versioning?: Partial<VersioningSettings>;
    };
  };

/** Migration construct */
export class MigrationConstruct extends Construct {
  public versioning: VersioningSettings;

  constructor(scope: Construct, id: string, props: MigrationConstructProps) {
    super(scope, id);
    const { migrationLambdaFunction, settings } = props;

    // Versioning
    const versioningPartitionKey =
      settings?.versioning?.partitionKeyName ?? DEFAULT_PARTITION_KEY_NAME;
    const versioningSortKey =
      settings?.versioning?.sortKeyName ?? DEFAULT_SORT_KEY_NAME;
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
        settings?.versioning?.migrationPartitionKey ??
        DEFAULT_MIGRATION_PARTITION_KEY,
    };

    // STEPS

    // Check migration version
    const setupFirstVersionIfNotDefined = new DynamoPutItem(
      this,
      'SetupFirstVersion',
      {
        table: this.versioning.table,
        item: {
          [this.versioning.partitionKeyName]: DynamoAttributeValue.fromString(
            this.versioning.migrationPartitionKey,
          ),
          [this.versioning.sortKeyName]: DynamoAttributeValue.fromString(
            CURRENT_STATUS_SORT_KEY,
          ),
          status: DynamoAttributeValue.fromString('NOT_RUN'),
          version: DynamoAttributeValue.numberFromString('0'),
          metadata: getMetadata(),
        },
        conditionExpression: 'attribute_not_exists(#version)',
        expressionAttributeNames: {
          '#version': 'version',
        },
        resultPath: '$.dynamoResponse',
      },
    );

    const shouldRunMigration = new DynamoGetItem(this, 'GetCurrentVersion', {
      table: this.versioning.table,
      key: {
        [this.versioning.partitionKeyName]: DynamoAttributeValue.fromString(
          this.versioning.migrationPartitionKey,
        ),

        [this.versioning.sortKeyName]: DynamoAttributeValue.fromString(
          CURRENT_STATUS_SORT_KEY,
        ),
      },
      resultSelector: {
        // Item.version.N must be casted to a number
        value: JsonPath.stringToJson(JsonPath.stringAt('$.Item.version.N')),
        '_dynamoResponse.$': '$',
      },
      resultPath: '$.currentVersion',
    });

    // Run Migration
    const runMigrationsJob = new LambdaInvoke(this, 'RunMigrationJob', {
      lambdaFunction: migrationLambdaFunction,
      resultSelector: {
        'payload.$': '$.Payload',
        'status.$': '$.Payload.status',
      },
      resultPath: '$.migrationResponse',
    });

    // Success branch
    const success = new Succeed(this, 'MigrationSucceeded');
    const successBranch = new DynamoPutItem(this, 'MigrationSuccess', {
      table: this.versioning.table,
      item: {
        [this.versioning.partitionKeyName]: DynamoAttributeValue.fromString(
          this.versioning.migrationPartitionKey,
        ),
        [this.versioning.sortKeyName]: DynamoAttributeValue.fromString(
          CURRENT_STATUS_SORT_KEY,
        ),
        status: DynamoAttributeValue.fromString(SUCCESS_STATUS),
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
            status: DynamoAttributeValue.fromString(SUCCESS_STATUS),
            // targetVersion must be casted to a string when calling DynamoDB
            version: DynamoAttributeValue.numberFromString(
              JsonPath.format('{}', JsonPath.stringAt('$.targetVersion')),
            ),
            metadata: getMetadata(),
          },
        }),
      )
      .next(success);

    // Failure branch
    const jobFailed = new DynamoUpdateItem(this, 'MigrationFailure', {
      table: this.versioning.table,
      key: {
        [this.versioning.partitionKeyName]: DynamoAttributeValue.fromString(
          this.versioning.migrationPartitionKey,
        ),
        [this.versioning.sortKeyName]: DynamoAttributeValue.fromString(
          CURRENT_STATUS_SORT_KEY,
        ),
      },
      updateExpression: 'SET #status = :status, #metadata = :metadata',
      expressionAttributeNames: {
        '#status': 'status',
        '#metadata': 'metadata',
      },
      expressionAttributeValues: {
        ':status': DynamoAttributeValue.fromString(FAILURE_STATUS),
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
            status: DynamoAttributeValue.fromString(FAILURE_STATUS),
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

    // STATE MACHINE ASSEMBLY

    setupFirstVersionIfNotDefined.next(shouldRunMigration);

    setupFirstVersionIfNotDefined.addCatch(shouldRunMigration, {
      errors: ['DynamoDB.ConditionalCheckFailedException'],
      resultPath: '$.dynamoResponse',
    });

    shouldRunMigration.next(
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

    runMigrationsJob.next(
      new Choice(this, 'IsMigrationComplete')
        .when(
          Condition.stringEquals('$.migrationResponse.status', SUCCESS_STATUS),
          successBranch,
        )
        .otherwise(jobFailed),
    );

    new StateMachine(this, 'RunMigrationsStateMachine', {
      definitionBody: ChainDefinitionBody.fromChainable(
        setupFirstVersionIfNotDefined,
      ),
      timeout: Duration.minutes(5),
    });
  }
}
