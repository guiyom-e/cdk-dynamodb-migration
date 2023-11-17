// https://aws.amazon.com/blogs/devops/implementing-long-running-deployments-with-aws-cloudformation-custom-resources-using-aws-step-functions/
// https://github.com/aws-samples/aws-cfn-custom-resource-using-step-functions/blob/main/src/step-function/stack-main.ts#L411

import {
  CfnWaitCondition,
  CfnWaitConditionHandle,
  CustomResource,
  Duration,
} from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import path from 'path';

interface AutoRunMigrationsOnDeployProps {
  customResourceStateMachine: StateMachine;
  targetVersion: number;
}

export class AutoRunMigrationsOnDeploy extends Construct {
  constructor(
    scope: Construct,
    id: string,
    props: AutoRunMigrationsOnDeployProps,
  ) {
    super(scope, id);
    const { customResourceStateMachine, targetVersion } = props;

    const customResourceLambda = new NodejsFunction(
      this,
      'RunMigrationStateMachine',
      {
        runtime: Runtime.NODEJS_18_X,
        handler: 'index.handler',
        entry: path.join(__dirname, 'handler.ts'),
        timeout: Duration.seconds(600), // Why ?
        environment: {
          ACCOUNT_ID: 'this.account', // TODO
          REGION: 'this.region',
          SFN_ARN: customResourceStateMachine.stateMachineArn,
        },
      },
    );

    // Permissions to invoke step function
    customResourceLambda.addToRolePolicy(
      new PolicyStatement({
        actions: ['states:StartExecution'],
        effect: Effect.ALLOW,
        resources: [customResourceStateMachine.stateMachineArn],
      }),
    );

    // Suppress rule for AWSLambdaBasicExecutionRole
    // NagSuppressions.addResourceSuppressions(
    //   customResourceLambda,
    //   [
    //     {
    //       id: 'AwsSolutions-IAM4',
    //       reason: 'Suppress AwsSolutions-IAM4 for AWSLambdaBasicExecutionRole',
    //       appliesTo: [
    //         'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
    //       ],
    //     },
    //   ],
    //   true,
    // );

    // const resourceName: string =
    //   getNormalizedResourceName('DemoCustomResource');
    // const demoData = {
    //   pk: 'demo-sfn',
    //   sk: resourceName,
    //   ts: Date.now().toString(),
    // };
    // const dataHash = hash(demoData);
    const wcHandle = new CfnWaitConditionHandle(this, 'WCHandle');

    const customResource = new CustomResource(this, 'AutoMigrate', {
      serviceToken: customResourceLambda.functionArn,
      properties: {
        targetVersion,
        CallbackUrl: wcHandle.ref, // todo : handle it in step functions
      },
    });

    // Note: AWS::CloudFormation::WaitCondition resource type does not support updates.
    new CfnWaitCondition(this, 'WC', {
      count: 1,
      timeout: '300', // Why ?
      handle: wcHandle.ref,
    }).node.addDependency(customResource);
  }
}
