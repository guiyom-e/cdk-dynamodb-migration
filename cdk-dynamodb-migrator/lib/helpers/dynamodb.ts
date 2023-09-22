import { JsonPath } from 'aws-cdk-lib/aws-stepfunctions';
import { DynamoAttributeValue } from 'aws-cdk-lib/aws-stepfunctions-tasks';

export const getMetadata = (): DynamoAttributeValue =>
  DynamoAttributeValue.fromMap({
    date: DynamoAttributeValue.fromString(JsonPath.stateEnteredTime),
    stateMachineId: DynamoAttributeValue.fromString(JsonPath.stateMachineId),
    startedAt: DynamoAttributeValue.fromString(JsonPath.executionStartTime),
  });

export const getVersionSortKey = ({
  versionPath,
}: {
  versionPath: string;
}): DynamoAttributeValue =>
  DynamoAttributeValue.fromString(
    JsonPath.format(
      'VERSION_{}#{}#{}',
      JsonPath.stringAt(versionPath),
      JsonPath.executionStartTime,
      JsonPath.uuid(),
    ),
  );

export const getVersionForDynamoDb = (path: string): DynamoAttributeValue =>
  DynamoAttributeValue.numberFromString(
    // targetVersion must be casted to a string when calling DynamoDB
    JsonPath.jsonToString(JsonPath.numberAt(path)),
  );
