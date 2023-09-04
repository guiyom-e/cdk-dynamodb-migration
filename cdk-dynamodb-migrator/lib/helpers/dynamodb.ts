import { JsonPath } from 'aws-cdk-lib/aws-stepfunctions';
import { DynamoAttributeValue } from 'aws-cdk-lib/aws-stepfunctions-tasks';

export const getMetadata = (): DynamoAttributeValue =>
  DynamoAttributeValue.fromMap({
    date: DynamoAttributeValue.fromString(JsonPath.stateEnteredTime),
    stateMachineId: DynamoAttributeValue.fromString(JsonPath.stateMachineId),
    startedAt: DynamoAttributeValue.fromString(JsonPath.executionStartTime),
  });

export const getVersionSortKey = (): DynamoAttributeValue =>
  DynamoAttributeValue.fromString(
    JsonPath.format(
      'VERSION_{}#{}#{}',
      JsonPath.stringAt('$.targetVersion'),
      JsonPath.executionStartTime,
      JsonPath.uuid(),
    ),
  );

export const getTargetVersionForDynamoDb = (): DynamoAttributeValue =>
  DynamoAttributeValue.numberFromString(
    // targetVersion must be casted to a string when calling DynamoDB
    JsonPath.jsonToString(JsonPath.numberAt('$.targetVersion')),
  );
