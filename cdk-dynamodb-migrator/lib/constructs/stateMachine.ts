import { Duration } from 'aws-cdk-lib';
import {
  ChainDefinitionBody,
  Choice,
  Condition,
  Fail,
  JsonPath,
  Pass,
  StateMachine,
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

import { MigrationHandling, VersioningSettings } from './types';
import {
  CURRENT_STATUS_SORT_KEY,
  FAILURE_STATUS,
  SUCCESS_STATUS,
} from '../constants';
import {
  getMetadata,
  getTargetVersionForDynamoDb,
  getVersionSortKey,
} from '../helpers/dynamodb';

interface MigrationStateMachineProps {
  migrationHandling: MigrationHandling;
  versioning: VersioningSettings;
}

export class MigrationStateMachine extends Construct {
  constructor(scope: Construct, id: string, props: MigrationStateMachineProps) {
    super(scope, id);

    const {
      migrationHandling: { migrationLambdaFunction },
      versioning,
    } = props;

    // STEPS
    // Validate input
    const validateInput = new Pass(this, 'ValidateInput', {
      parameters: {
        request: JsonPath.objectAt('$'),
        // Validates targetVersion is a number
        targetVersion: JsonPath.mathAdd(
          JsonPath.numberAt('$.targetVersion'),
          0,
        ),
      },
    });

    // Check migration version
    const setupFirstVersionIfNotDefined = new DynamoPutItem(
      this,
      'SetupFirstVersion',
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

    const shouldRunMigration = new DynamoGetItem(this, 'GetCurrentVersion', {
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
    });

    // Run Migration
    const runMigrationsJob = new LambdaInvoke(this, 'RunMigrationJob', {
      inputPath: '$.request',
      lambdaFunction: migrationLambdaFunction,
      resultSelector: {
        'payload.$': '$.Payload',
        'status.$': '$.Payload.status',
      },
      resultPath: '$.migrationResponse',
    });

    // Success branch
    const success = new Succeed(this, 'MigrationSucceeded');
    const successBranch = new DynamoPutItem(this, 'MigrationSuccess', {
      table: versioning.table,
      item: {
        [versioning.partitionKeyName]: DynamoAttributeValue.fromString(
          versioning.migrationPartitionKey,
        ),
        [versioning.sortKeyName]: DynamoAttributeValue.fromString(
          CURRENT_STATUS_SORT_KEY,
        ),
        status: DynamoAttributeValue.fromString(SUCCESS_STATUS),
        version: getTargetVersionForDynamoDb(),
        metadata: getMetadata(),
      },
      resultPath: JsonPath.DISCARD,
    });
    successBranch
      .next(
        new DynamoPutItem(this, 'SetHistoryOnSuccess', {
          table: versioning.table,
          item: {
            [versioning.partitionKeyName]: DynamoAttributeValue.fromString(
              versioning.migrationPartitionKey,
            ),
            [versioning.sortKeyName]: getVersionSortKey(),
            status: DynamoAttributeValue.fromString(SUCCESS_STATUS),
            // targetVersion must be casted to a string when calling DynamoDB
            version: DynamoAttributeValue.numberFromString(
              JsonPath.format('{}', JsonPath.stringAt('$.targetVersion')),
            ),
            metadata: getMetadata(),
          },
        }),
      )
      .next(success);

    // Failure branch
    const jobFailed = new DynamoUpdateItem(this, 'MigrationFailure', {
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
    });
    jobFailed
      .next(
        new DynamoPutItem(this, 'SetHistoryOnFailure', {
          table: versioning.table,
          item: {
            [versioning.partitionKeyName]: DynamoAttributeValue.fromString(
              versioning.migrationPartitionKey,
            ),
            [versioning.sortKeyName]: getVersionSortKey(),
            status: DynamoAttributeValue.fromString(FAILURE_STATUS),
            // targetVersion must be casted to a string when calling DynamoDB
            version: getTargetVersionForDynamoDb(),
            metadata: getMetadata(),
          },
        }),
      )
      .next(
        new Fail(this, 'MigrationFailed', {
          cause: 'See RunMigrationJob for details',
          error: 'Migration Failed',
        }),
      );

    // STATE MACHINE ASSEMBLY
    validateInput.next(setupFirstVersionIfNotDefined);

    setupFirstVersionIfNotDefined.next(shouldRunMigration);

    setupFirstVersionIfNotDefined.addCatch(shouldRunMigration, {
      errors: ['DynamoDB.ConditionalCheckFailedException'],
      resultPath: JsonPath.DISCARD,
    });

    shouldRunMigration.next(
      new Choice(this, 'ShouldRunMigration')
        .when(
          Condition.and(
            Condition.isNumeric('$.targetVersion'),
            Condition.isNumeric('$.currentVersion.value'),
            Condition.numberGreaterThanJsonPath(
              '$.targetVersion',
              '$.currentVersion.value',
            ),
          ),
          runMigrationsJob,
        )
        .otherwise(success),
    );

    runMigrationsJob.next(
      new Choice(this, 'IsMigrationComplete')
        .when(
          Condition.stringEquals('$.migrationResponse.status', SUCCESS_STATUS),
          successBranch,
        )
        .otherwise(jobFailed),
    );

    const stateMachineDefinition = validateInput;

    new StateMachine(this, 'RunMigrationsStateMachine', {
      definitionBody: ChainDefinitionBody.fromChainable(stateMachineDefinition),
      timeout: Duration.minutes(5),
    });
  }
}
