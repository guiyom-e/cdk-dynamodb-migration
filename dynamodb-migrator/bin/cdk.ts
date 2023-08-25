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
  type: 'generic',
  migrationLambdaFunction: userStack.runMigrationsFunction,
  settings: {},
});
