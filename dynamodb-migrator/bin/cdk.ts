#!/usr/bin/env node
import 'source-map-support/register';
import { App, Stack, StackProps } from 'aws-cdk-lib';
import { MigrationStack } from '../lib/cdk-stack';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import path = require('path');
import { Construct } from 'constructs';

const app = new App();

// TODO: move this in demo
class UserStack extends Stack {
  public runMigrationsFunction: IFunction;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.runMigrationsFunction = new NodejsFunction(
      this,
      'runMigrationsFunction',
      {
        runtime: Runtime.NODEJS_18_X,
        handler: 'index.handler',
        entry: path.join(__dirname, 'runMigrationsLambda/index.ts'),
      },
    );
  }
}

const userStack = new UserStack(app, 'UserStack');

new MigrationStack(app, 'MigrationStack', {
  migrationLambdaFunction: userStack.runMigrationsFunction,
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */
  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },
  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});

//Add another stack that comes from the app with the migration lambda
