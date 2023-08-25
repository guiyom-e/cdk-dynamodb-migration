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
    date: DynamoAttributeValue.fromString(
      JsonPath.stringAt('$$.State.EnteredTime'),
    ),
    startedAt: DynamoAttributeValue.fromString(
      JsonPath.stringAt('$$.Execution.StartTime'),
    ),
  });

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
      // Lambda's result is in the attribute `guid`
      outputPath: '$.Payload',
    });

    const jobSuccess = new DynamoPutItem(this, 'MigrationSuccess', {
      table: this.versioning.table,
      item: {
        [this.versioning.partitionKeyName]: DynamoAttributeValue.fromString(
          this.versioning.migrationPartitionKey,
        ),
        [this.versioning.sortKeyName]:
          DynamoAttributeValue.fromString('STATUS'),
        value: DynamoAttributeValue.fromString('SUCCEEDED'),
        metadata: getMetadata(),
      },
    });
    jobSuccess.next(new Succeed(this, 'MigrationSucceeded'));

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
    });
    jobFailed.next(
      new Fail(this, 'MigrationFailed', {
        cause: 'See RunMigrationJob for details',
        error: 'Migration Failed',
      }),
    );

    const definition = runMigrationsJob.next(
      new Choice(this, 'IsMigrationComplete')
        .when(Condition.stringEquals('$.status', 'SUCCEEDED'), jobSuccess)
        .otherwise(jobFailed),
    );

    new StateMachine(this, 'RunMigrationsStateMachine', {
      definition,
      timeout: Duration.minutes(5),
    });
  }
}
