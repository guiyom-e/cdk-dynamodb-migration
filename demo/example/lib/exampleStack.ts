import { Stack, StackProps } from 'aws-cdk-lib';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { MigrationConstruct } from 'cdk-dynamodb-migrator';
import { Construct } from 'constructs';
import path from 'path';

export class ExampleStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const dinosaursTable = new Table(this, 'DinosaursTable', {
      tableName: 'Dinosaurs',
      partitionKey: { name: 'dinosaurId', type: AttributeType.STRING },
    });

    const migrationLambdaFunction = new NodejsFunction(
      this,
      'MigrationLambdaFunction',
      {
        runtime: Runtime.NODEJS_18_X,
        handler: 'index.handler',
        entry: path.join(__dirname, 'runMigrationsLambda/index.ts'),
        logRetention: RetentionDays.ONE_WEEK,
        architecture: Architecture.ARM_64,
      },
    );

    dinosaursTable.grantReadWriteData(migrationLambdaFunction);

    new MigrationConstruct(this, 'DynamoDBMigrator', {
      configuration: {
        id: 'default',
        migrationHandling: {
          type: 'lambda',
          migrationLambdaFunction,
        },
      },
    });
  }
}
