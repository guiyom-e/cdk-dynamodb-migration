import { StackProps } from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

import { MigrationStateMachine } from './stepFunctions/stateMachine';
import { MultipleMigrationsStateMachine } from './stepFunctions/stateMachineMultiple';
import { MigrationConfiguration, VersioningSettings } from './types';
import {
  DEFAULT_FIRST_VERSION,
  DEFAULT_MIGRATION_PARTITION_KEY,
  DEFAULT_PARTITION_KEY_NAME,
  DEFAULT_SORT_KEY_NAME,
} from '../constants';

/** MigrationConstruct props */
export type MigrationConstructProps = StackProps & {
  configuration: MigrationConfiguration;
  settings?: {
    versioning?: Partial<VersioningSettings>;
  };
};

const getVersioningSettings = (
  scope: Construct,
  settings?: {
    versioning?: Partial<VersioningSettings>;
  },
): VersioningSettings => {
  const versioningPartitionKey =
    settings?.versioning?.partitionKeyName ?? DEFAULT_PARTITION_KEY_NAME;
  const versioningSortKey =
    settings?.versioning?.sortKeyName ?? DEFAULT_SORT_KEY_NAME;
  const versioningTable =
    settings?.versioning?.table ??
    new Table(scope, 'VersioningTable', {
      partitionKey: {
        name: versioningPartitionKey,
        type: AttributeType.STRING,
      },
      sortKey: {
        name: versioningSortKey,
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

  return {
    table: versioningTable,
    partitionKeyName: versioningPartitionKey,
    sortKeyName: versioningSortKey,
    migrationPartitionKey:
      settings?.versioning?.migrationPartitionKey ??
      DEFAULT_MIGRATION_PARTITION_KEY,
    firstVersion: settings?.versioning?.firstVersion ?? DEFAULT_FIRST_VERSION,
  };
};

/** Migration construct */
export class MigrationConstruct extends Construct {
  public versioning: VersioningSettings;
  public migrationStateMachine: MigrationStateMachine;

  constructor(scope: Construct, id: string, props: MigrationConstructProps) {
    super(scope, id);
    const { configuration, settings } = props;

    // Versioning
    this.versioning = getVersioningSettings(this, settings);

    // State machine
    this.migrationStateMachine = new MigrationStateMachine(this, 'MSM', {
      configuration,
      versioning: this.versioning,
    });
  }
}

/** MigrationConstruct props */
export type MultipleMigrationsConstructProps = StackProps & {
  configurations: MigrationConfiguration[];
  settings?: {
    versioning?: Partial<VersioningSettings>;
  };
};

/** Migration construct for multiple migration handlers */
export class MultipleMigrationsConstruct extends Construct {
  public versioning: VersioningSettings;
  public migrationStateMachine: MultipleMigrationsStateMachine;

  constructor(
    scope: Construct,
    id: string,
    props: MultipleMigrationsConstructProps,
  ) {
    super(scope, id);
    const { configurations, settings } = props;

    // Versioning
    this.versioning = getVersioningSettings(this, settings);

    // State machine
    this.migrationStateMachine = new MultipleMigrationsStateMachine(
      this,
      'MSM',
      {
        configurations,
        versioning: this.versioning,
      },
    );
  }
}
