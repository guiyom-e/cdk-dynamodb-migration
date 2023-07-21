import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DynamoDBMigrator } from 'cdk-dynamodb-migrator';

export class ExampleStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new DynamoDBMigrator(this, 'DynamoDBMigrator', {});
  }
}
