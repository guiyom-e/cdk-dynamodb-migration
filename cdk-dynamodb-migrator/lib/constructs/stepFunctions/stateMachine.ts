import {
  ChainDefinitionBody,
  StateMachine,
} from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';

import { getMigrationStateMachineBaseDefinition } from './getStateMachineBaseDefinition';
import { MigrationConfiguration, VersioningSettings } from '../types';

interface MigrationStateMachineProps {
  configuration: MigrationConfiguration;
  versioning: VersioningSettings;
}

export class MigrationStateMachine extends Construct {
  constructor(scope: Construct, id: string, props: MigrationStateMachineProps) {
    super(scope, id);

    const {
      configuration: { id: configId, migrationHandling },
      versioning,
    } = props;

    const definition = getMigrationStateMachineBaseDefinition(this, {
      id: configId,
      index: 0,
      migrationHandling,
      versioning,
    });

    new StateMachine(this, 'RunMigrationsStateMachine', {
      definitionBody: ChainDefinitionBody.fromChainable(definition),
    });
  }
}
