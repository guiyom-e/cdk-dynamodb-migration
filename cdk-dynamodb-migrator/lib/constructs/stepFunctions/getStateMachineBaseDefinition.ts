import {
  Choice,
  Condition,
  Fail,
  JsonPath,
  Pass,
  State,
  Succeed,
} from 'aws-cdk-lib/aws-stepfunctions';
import {
  DynamoAttributeValue,
  DynamoGetItem,
  DynamoPutItem,
  DynamoUpdateItem,
  LambdaInvoke,
} from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';

import {
  CURRENT_STATUS_SORT_KEY,
  FAILURE_STATUS,
  SUCCESS_STATUS,
} from '../../constants';
import {
  getMetadata,
  getVersionForDynamoDb,
  getVersionSortKey,
} from '../../helpers/dynamodb';
import { MigrationHandling, VersioningSettings } from '../types';

interface MigrationStateMachineProps {
  id: string;
  migrationHandling: MigrationHandling;
  versioning: VersioningSettings;
}

export const getMigrationStateMachineBaseDefinition = (
  scope: Construct,
  props: MigrationStateMachineProps,
): State => {
  const {
    id: definitionId,
    migrationHandling: { migrationLambdaFunction },
    versioning,
  } = props;

  // STEPS
  // Check migration version
  const setupFirstVersionIfNotDefined = new DynamoPutItem(
    scope,
    `SetupFirstVersion${definitionId}`,
    {
      table: versioning.table,
      item: {
        [versioning.partitionKeyName]: DynamoAttributeValue.fromString(
          versioning.migrationPartitionKey,
        ),
        [versioning.sortKeyName]: DynamoAttributeValue.fromString(
          CURRENT_STATUS_SORT_KEY,
        ),
        status: DynamoAttributeValue.fromString('NOT_RUN'),
        version: DynamoAttributeValue.numberFromString('0'),
        metadata: getMetadata(),
      },
      conditionExpression: 'attribute_not_exists(#version)',
      expressionAttributeNames: {
        '#version': 'version',
      },
      resultPath: JsonPath.DISCARD,
    },
  );

  const getCurrentVersion = new DynamoGetItem(
    scope,
    `GetCurrentVersion${definitionId}`,
    {
      table: versioning.table,
      key: {
        [versioning.partitionKeyName]: DynamoAttributeValue.fromString(
          versioning.migrationPartitionKey,
        ),

        [versioning.sortKeyName]: DynamoAttributeValue.fromString(
          CURRENT_STATUS_SORT_KEY,
        ),
      },
      resultSelector: {
        // Item.version.N must be casted to a number
        value: JsonPath.stringToJson(JsonPath.stringAt('$.Item.version.N')),
      },
      resultPath: '$.currentVersion',
    },
  );

  // Prepare migration
  const prepareMigrationWithTargetVersion = new Pass(
    scope,
    `PrepareMigrationWithTargetVersion${definitionId}`,
    {
      parameters: {
        currentVersion: JsonPath.numberAt('$.currentVersion.value'),
        targetVersion: JsonPath.numberAt('$.targetVersion'),
        parameters: JsonPath.executionInput,
      },
      resultPath: '$',
    },
  );

  const prepareMigrationWithoutTargetVersion = new Pass(
    scope,
    `PrepareMigrationWithoutTargetVersion${definitionId}`,
    {
      parameters: {
        currentVersion: JsonPath.numberAt('$.currentVersion.value'),
        parameters: JsonPath.executionInput,
      },
      resultPath: '$',
    },
  );

  // Run Migration
  const runMigrationsJob = new LambdaInvoke(
    scope,
    `RunMigrationJob${definitionId}`,
    {
      lambdaFunction: migrationLambdaFunction,
      resultSelector: {
        'payload.$': '$.Payload',
        'status.$': '$.Payload.status',
        // Override targetVersion with migration response
        'targetVersion.$': '$.Payload.targetVersion',
      },
      resultPath: '$.migrationResponse',
    },
  );

  // Success branch
  const success = new Succeed(scope, `MigrationSucceeded${definitionId}`);
  const successBranch = new DynamoPutItem(
    scope,
    `MigrationSuccess${definitionId}`,
    {
      table: versioning.table,
      item: {
        [versioning.partitionKeyName]: DynamoAttributeValue.fromString(
          versioning.migrationPartitionKey,
        ),
        [versioning.sortKeyName]: DynamoAttributeValue.fromString(
          CURRENT_STATUS_SORT_KEY,
        ),
        status: DynamoAttributeValue.fromString(SUCCESS_STATUS),
        previousVersion: getVersionForDynamoDb('$.currentVersion'),
        version: getVersionForDynamoDb('$.migrationResponse.targetVersion'),
        metadata: getMetadata(),
      },
      resultPath: JsonPath.DISCARD,
    },
  );
  successBranch
    .next(
      new DynamoPutItem(scope, `SetHistoryOnSuccess${definitionId}`, {
        table: versioning.table,
        item: {
          [versioning.partitionKeyName]: DynamoAttributeValue.fromString(
            versioning.migrationPartitionKey,
          ),
          [versioning.sortKeyName]: getVersionSortKey({
            versionPath: '$.migrationResponse.targetVersion',
          }),
          status: DynamoAttributeValue.fromString(SUCCESS_STATUS),
          previousVersion: getVersionForDynamoDb('$.currentVersion'),
          targetVersion: getVersionForDynamoDb(
            '$.migrationResponse.targetVersion',
          ),
          metadata: getMetadata(),
        },
      }),
    )
    .next(success);

  // Failure branch
  const jobFailed = new DynamoUpdateItem(
    scope,
    `MigrationFailure${definitionId}`,
    {
      table: versioning.table,
      key: {
        [versioning.partitionKeyName]: DynamoAttributeValue.fromString(
          versioning.migrationPartitionKey,
        ),
        [versioning.sortKeyName]: DynamoAttributeValue.fromString(
          CURRENT_STATUS_SORT_KEY,
        ),
      },
      updateExpression: 'SET #status = :status, #metadata = :metadata',
      expressionAttributeNames: {
        '#status': 'status',
        '#metadata': 'metadata',
      },
      expressionAttributeValues: {
        ':status': DynamoAttributeValue.fromString(FAILURE_STATUS),
        ':metadata': getMetadata(),
      },
      resultPath: JsonPath.DISCARD,
    },
  );
  jobFailed
    .next(
      new DynamoPutItem(scope, `SetHistoryOnFailure${definitionId}`, {
        table: versioning.table,
        item: {
          [versioning.partitionKeyName]: DynamoAttributeValue.fromString(
            versioning.migrationPartitionKey,
          ),
          [versioning.sortKeyName]: getVersionSortKey({
            versionPath: '$.migrationResponse.targetVersion',
          }),
          status: DynamoAttributeValue.fromString(FAILURE_STATUS),
          previousVersion: getVersionForDynamoDb('$.currentVersion'),
          targetVersion: getVersionForDynamoDb(
            '$.migrationResponse.targetVersion',
          ),
          metadata: getMetadata(),
        },
      }),
    )
    .next(
      new Fail(scope, `MigrationFailed${definitionId}`, {
        cause: 'See RunMigrationJob for details',
        error: 'Migration Failed',
      }),
    );

  // STATE MACHINE ASSEMBLY
  setupFirstVersionIfNotDefined.next(getCurrentVersion);

  setupFirstVersionIfNotDefined.addCatch(getCurrentVersion, {
    errors: ['DynamoDB.ConditionalCheckFailedException'],
    resultPath: JsonPath.DISCARD,
  });

  getCurrentVersion.next(
    new Choice(scope, `IsTargetVersionDefined${definitionId}`)
      .when(
        Condition.isPresent('$.targetVersion'),
        prepareMigrationWithTargetVersion,
      )
      .otherwise(prepareMigrationWithoutTargetVersion),
  );

  prepareMigrationWithoutTargetVersion.next(runMigrationsJob);

  prepareMigrationWithTargetVersion.next(
    new Choice(scope, `ShouldRunMigration${definitionId}`)
      .when(
        Condition.and(
          Condition.isNumeric('$.targetVersion'),
          Condition.isNumeric('$.currentVersion'),
          Condition.not(
            Condition.numberEqualsJsonPath(
              '$.targetVersion',
              '$.currentVersion',
            ),
          ),
        ),
        runMigrationsJob,
      )
      .otherwise(success),
  );

  runMigrationsJob.next(
    new Choice(scope, `IsMigrationComplete${definitionId}`)
      .when(
        Condition.stringEquals('$.migrationResponse.status', SUCCESS_STATUS),
        successBranch,
      )
      .otherwise(jobFailed),
  );

  const stateMachineDefinition = setupFirstVersionIfNotDefined;

  return stateMachineDefinition;
};
