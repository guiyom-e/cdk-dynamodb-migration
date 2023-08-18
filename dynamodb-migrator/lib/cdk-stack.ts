import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { BillingMode, Table, AttributeType } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import {
  Fail,
  Succeed,
  Choice,
  Condition,
  StateMachine,
} from 'aws-cdk-lib/aws-stepfunctions';

interface TableMigration {
  type: 'table';
  table: Table;
}

interface GenericMigration {
  type: 'generic';
}

type Migration = TableMigration | GenericMigration;
type MigrationStackProps = StackProps &
  Migration & {
    migrationLambdaFunction: IFunction;
    settings?: {
      versioning?: {
        enabled: boolean;
        table?: Table;
        pk?: string;
      };
    };
  };
export class MigrationStack extends Stack {
  constructor(scope: Construct, id: string, props: MigrationStackProps) {
    super(scope, id, props);
    const { migrationLambdaFunction } = props;

    const runMigrationsJob = new LambdaInvoke(this, 'Run Migrations Job', {
      lambdaFunction: migrationLambdaFunction,
      // Lambda's result is in the attribute `guid`
      outputPath: '$.Payload',
    });

    const jobFailed = new Fail(this, 'Job Failed', {
      cause: 'AWS Batch Job Failed',
      error: 'DescribeJob returned FAILED',
    });

    const definition = runMigrationsJob.next(
      new Choice(this, 'Job Complete?')
        .when(Condition.stringEquals('$.status', 'FAILED'), jobFailed)
        .when(
          Condition.stringEquals('$.status', 'SUCCEEDED'),
          new Succeed(this, 'Job Succeeded'),
        ),
    );

    // Versioning
    if (props.settings?.versioning?.enabled) {
      if (!props.settings.versioning.table) {
        new Table(this, 'VersioningTable', {
          partitionKey: {
            name: props?.settings?.versioning?.pk ?? '_version',
            type: AttributeType.STRING,
          },
        });
      }
    }

    new StateMachine(this, 'RunMigrationsStateMachine', {
      definition,
      timeout: Duration.minutes(5),
    });
  }
}
