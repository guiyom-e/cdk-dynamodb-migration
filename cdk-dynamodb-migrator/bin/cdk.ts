#!/usr/bin/env node
import 'source-map-support/register';
import { App, Stack, StackProps } from 'aws-cdk-lib';
import { IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import path = require('path');

import { MigrationStack, MultipleMigrationsStack } from '../lib';

const app = new App();

/** Simple stack to provide a lambda function to run migrations, for testing purposes. */
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
  configuration: {
    id: 'default',
    migrationHandling: {
      type: 'lambda',
      migrationLambdaFunction: userStack.runMigrationsFunction,
    },
  },
  settings: {},
});

new MultipleMigrationsStack(app, 'MultipleMigrationsStack', {
  configurations: [
    {
      id: 'default',
      migrationHandling: {
        type: 'lambda',
        migrationLambdaFunction: userStack.runMigrationsFunction,
      },
    },
    {
      id: 'second',
      migrationHandling: {
        type: 'lambda',
        migrationLambdaFunction: userStack.runMigrationsFunction,
      },
    },
  ],
  settings: {},
});
