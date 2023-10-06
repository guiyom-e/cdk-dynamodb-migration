import {
  ChainDefinitionBody,
  JsonPath,
  Parallel,
  Pass,
  StateMachine,
} from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';

import { getMigrationStateMachineBaseDefinition } from './getStateMachineBaseDefinition';
import { MigrationHandling, VersioningSettings } from '../types';

interface MigrationStateMachineProps {
  configurations: [
    {
      migrationHandling: MigrationHandling;
      versioning: VersioningSettings;
    },
  ];
}

export class MigrationStateMachine extends Construct {
  constructor(scope: Construct, id: string, props: MigrationStateMachineProps) {
    super(scope, id);

    const { configurations } = props;

    const defineDefaults = new Pass(this, 'DefineDefaults', {
      parameters: {
        configurations: configurations.map((_, index) => ({ id: index })),
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
      ({ migrationHandling, versioning }, configIndex) =>
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
