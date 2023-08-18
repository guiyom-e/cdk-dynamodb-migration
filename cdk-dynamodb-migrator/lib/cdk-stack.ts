import * as cdk from 'aws-cdk-lib';
// import { BillingMode, Table, AttributeType } from 'aws-cdk-lib/aws-dynamodb';
import {} from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';

import path = require('path');
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
export class DynamoDBMigratorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    console.log('path', path.join(__dirname, 'runMigrationsLambda/index.ts'));

    console.log(
      'code',
      lambda.Code.fromAsset(path.join(__dirname, 'runMigrationsLambda')),
    );

    const runMigrationsFunction = new NodejsFunction(
      this,
      'runMigrationsFunction',
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        entry: path.join(__dirname, 'runMigrationsLambda/index.ts'),
      },
    );

    const runMigrationsJob = new tasks.LambdaInvoke(
      this,
      'Run Migrations Job',
      {
        lambdaFunction: runMigrationsFunction,
        // Lambda's result is in the attribute `guid`
        outputPath: '$.Payload',
      },
    );

    const jobFailed = new sfn.Fail(this, 'Job Failed', {
      cause: 'AWS Batch Job Failed',
      error: 'DescribeJob returned FAILED',
    });

    const definition = runMigrationsJob.next(
      new sfn.Choice(this, 'Job Complete?')
        .when(sfn.Condition.stringEquals('$.status', 'FAILED'), jobFailed)
        .when(
          sfn.Condition.stringEquals('$.status', 'SUCCEEDED'),
          new sfn.Succeed(this, 'Job Succeeded'),
        ),
    );

    // add step function here
    // const table = new Table(this, 'Table', {
    //   partitionKey: { name: 'modelName', type: AttributeType.STRING },
    //   sortKey: { name: 'id', type: AttributeType.STRING },
    //   billingMode: BillingMode.PAY_PER_REQUEST,
    // });

    new sfn.StateMachine(this, 'RunMigrationsStateMachine', {
      definition,
      timeout: cdk.Duration.minutes(5),
    });

    // console.log(table.tableName);
  }
}
