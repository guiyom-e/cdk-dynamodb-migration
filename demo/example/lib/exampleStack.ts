import { Stack, StackProps } from 'aws-cdk-lib';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { MigrationConstruct } from 'cdk-dynamodb-migrator';
import { Construct } from 'constructs';
import path from 'path';

export class ExampleStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const dinosaursTable = new Table(this, 'DinosaursTable', {
      partitionKey: { name: 'DinosaurID', type: AttributeType.STRING },
    });

    const lambdaRole = new Role(this, 'MigrationLambdaRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });

    lambdaRole.addToPolicy(
      new PolicyStatement({
        actions: [
          'dynamodb:GetItem',
          'dynamodb:UpdateItem',
          'dynamodb:DeleteItem',
        ],
        resources: [dinosaursTable.tableArn],
      }),
    );

    new MigrationConstruct(this, 'DynamoDBMigrator', {
      configuration: {
        id: 'default',
        migrationHandling: {
          type: 'lambda',
          migrationLambdaFunction: new NodejsFunction(
            this,
            'MigrationLambdaFunction',
            {
              runtime: Runtime.NODEJS_18_X,
              handler: 'index.handler',
              entry: path.join(__dirname, 'runMigrationsLambda/index.ts'),
              role: lambdaRole,
            },
          ),
        },
      },
    });
  }
}
