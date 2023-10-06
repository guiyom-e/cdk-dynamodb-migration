import {
  ChainDefinitionBody,
  JsonPath,
  Parallel,
  Pass,
  StateMachine,
} from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';

import { getMigrationStateMachineBaseDefinition } from './getStateMachineBaseDefinition';
import { MigrationConfiguration, VersioningSettings } from '../types';

interface MigrationStateMachineProps {
  configurations: MigrationConfiguration[];
  versioning: VersioningSettings;
}

export class MigrationStateMachine extends Construct {
  constructor(scope: Construct, id: string, props: MigrationStateMachineProps) {
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
      ({ migrationHandling }, configIndex) =>
        getMigrationStateMachineBaseDefinition(this, {
          id: configIndex.toString(),
          index: configIndex,
          migrationHandling,
          versioning,
        }),
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
