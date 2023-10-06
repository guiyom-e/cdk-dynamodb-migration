import {
  ChainDefinitionBody,
  JsonPath,
  Parallel,
  Pass,
  StateMachine,
} from 'aws-cdk-lib/aws-stepfunctions';
import { StepFunctionsStartExecution } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';

import { getMigrationStateMachineBaseDefinition } from './getStateMachineBaseDefinition';
import { MigrationConfiguration, VersioningSettings } from '../types';

interface MultipleMigrationsStateMachineProps {
  configurations: MigrationConfiguration[];
  versioning: VersioningSettings;
}

export class MultipleMigrationsStateMachine extends Construct {
  constructor(
    scope: Construct,
    id: string,
    props: MultipleMigrationsStateMachineProps,
  ) {
    super(scope, id);

    const { configurations, versioning } = props;

    const defineDefaults = new Pass(this, 'DefineDefaults', {
      parameters: {
        configurations: configurations.map((config, index) => ({
          id: config.id,
          index,
        })),
      },
      resultPath: '$.inputDefaults',
    }).next(
      new Pass(this, 'ApplyDefaults', {
        resultPath: '$.withDefaults',
        outputPath: '$.withDefaults.args',
        parameters: {
          // Inspired from https://stackoverflow.com/a/74203476
          args: JsonPath.jsonMerge(
            JsonPath.objectAt('$.inputDefaults'),
            JsonPath.executionInput,
          ),
        },
      }),
    );

    const migrationBranches = configurations.map(
      ({ migrationHandling }, configIndex) => {
        const definition = getMigrationStateMachineBaseDefinition(this, {
          id: configIndex.toString(),
          index: configIndex,
          migrationHandling,
          versioning,
        });

        const stateMachine = new StateMachine(
          this,
          `RunMigrationsStateMachine${configIndex}}`,
          {
            definitionBody: ChainDefinitionBody.fromChainable(definition),
          },
        );

        return new StepFunctionsStartExecution(
          this,
          `StartExecution${configIndex}`,
          {
            stateMachine,
          },
        );
      },
    );

    const migrationsInParallel = new Parallel(
      this,
      'RunMigrationsParallel',
      {},
    ).branch(...migrationBranches);

    const definition = defineDefaults.next(migrationsInParallel);

    new StateMachine(this, 'RunMigrationsStateMachine', {
      definitionBody: ChainDefinitionBody.fromChainable(definition),
    });
  }
}
