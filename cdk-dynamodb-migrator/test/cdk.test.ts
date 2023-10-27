import { App, Stack, StackProps } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';

import { MigrationStack } from '../lib';
import { Construct } from 'constructs';

class StackWithLambda extends Stack {
  public runMigrationsFunction: Function;
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.runMigrationsFunction = new Function(this, 'runMigrationsFunction', {
      runtime: Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: Code.fromInline(
        "module.exports = { handler: async ({ currentVersion }) => ({ status: 'SUCCEEDED', targetVersion: currentVersion + 1 }) };",
      ),
    });
  }
}

test('Resources created, including DynamoDB table', () => {
  const app = new App();

  const lambdaStack = new StackWithLambda(app, 'LambdaStack');

  const migrationStack = new MigrationStack(app, 'TestStack', {
    configuration: {
      id: 'default',
      migrationHandling: {
        type: 'lambda',
        migrationLambdaFunction: lambdaStack.runMigrationsFunction,
      },
    },
  });

  const template = Template.fromStack(migrationStack);

  template.hasResourceProperties('AWS::DynamoDB::Table', {
    KeySchema: [
      {
        AttributeName: 'pk',
        KeyType: 'HASH',
      },
      {
        AttributeName: 'sk',
        KeyType: 'RANGE',
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  });

  template.hasResourceProperties('AWS::StepFunctions::StateMachine', {});
});
