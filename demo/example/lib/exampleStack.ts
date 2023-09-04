import { Stack, StackProps } from 'aws-cdk-lib';
// @ts-expect-error -- TODO: import error to be fixed
import { DynamoDBMigrator } from 'cdk-dynamodb-migrator';
import { Construct } from 'constructs';

export class ExampleStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- TODO: import error to be fixed
    new DynamoDBMigrator(this, 'DynamoDBMigrator', {});
  }
}
