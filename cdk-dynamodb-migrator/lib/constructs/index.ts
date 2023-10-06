import { StackProps } from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

import { MigrationStateMachine } from './stepFunctions/stateMachine';
import { MigrationHandling, VersioningSettings } from './types';
import {
  DEFAULT_FIRST_VERSION,
  DEFAULT_MIGRATION_PARTITION_KEY,
  DEFAULT_PARTITION_KEY_NAME,
  DEFAULT_SORT_KEY_NAME,
} from '../constants';

/** MigrationConstruct props */
export type MigrationConstructProps = StackProps & {
  migrationHandling: MigrationHandling;
  settings?: {
    versioning?: Partial<VersioningSettings>;
  };
};

/** Migration construct */
export class MigrationConstruct extends Construct {
  public versioning: VersioningSettings;
  public migrationStateMachine: MigrationStateMachine;

  constructor(scope: Construct, id: string, props: MigrationConstructProps) {
    super(scope, id);
    const { migrationHandling, settings } = props;

    // Versioning
    const versioningPartitionKey =
      settings?.versioning?.partitionKeyName ?? DEFAULT_PARTITION_KEY_NAME;
    const versioningSortKey =
      settings?.versioning?.sortKeyName ?? DEFAULT_SORT_KEY_NAME;
    const versioningTable =
      settings?.versioning?.table ??
      new Table(this, 'VersioningTable', {
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
    this.versioning = {
      table: versioningTable,
      partitionKeyName: versioningPartitionKey,
      sortKeyName: versioningSortKey,
      migrationPartitionKey:
        settings?.versioning?.migrationPartitionKey ??
        DEFAULT_MIGRATION_PARTITION_KEY,
      firstVersion: settings?.versioning?.firstVersion ?? DEFAULT_FIRST_VERSION,
    };

    // State machine
    this.migrationStateMachine = new MigrationStateMachine(this, 'MSM', {
      configurations: [
        {
          migrationHandling,
          versioning: this.versioning,
        },
      ],
    });
  }
}
