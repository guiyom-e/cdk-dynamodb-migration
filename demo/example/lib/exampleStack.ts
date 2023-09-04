import { Stack, StackProps } from 'aws-cdk-lib';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import DynamoDBMigrator from 'cdk-dynamodb-migrator';
import { Construct } from 'constructs';

export class ExampleStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new DynamoDBMigrator(this, 'DynamoDBMigrator', {
      type: 'generic',
      migrationLambdaFunction: new Function(this, 'MigrationLambdaFunction', {
        runtime: Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: Code.fromInline(
          'module.exports = {handler: async () => ({status: "SUCCEEDED"})};',
        ),
      }),
    });
  }
}
