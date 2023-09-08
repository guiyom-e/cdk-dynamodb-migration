import { StackProps } from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

import { MigrationStateMachine } from './stepFunctions/stateMachine';
import { MigrationConfiguration, VersioningSettings } from './types';
import {
  DEFAULT_FIRST_VERSION,
  DEFAULT_MIGRATION_PARTITION_KEY,
  DEFAULT_PARTITION_KEY_NAME,
  DEFAULT_SORT_KEY_NAME,
} from '../constants';

/** @todo */
interface TableMigration {
  type: 'table';
  table: Table;
}

interface GenericMigration {
  type: 'generic';
}

type Migration = TableMigration | GenericMigration;

/** Versioning settings of MigrationConstruct */
export type VersioningSettings = {
  /** DynamoDB table to store migration state and versions */
  table: Table;
  /** Partition key name of the versioning table */
  partitionKeyName: string;
  /** Sort key name of the versioning table */
  sortKeyName: string;
  /** Partition key value to use for the versioning purpose */
  migrationPartitionKey: string;
};

/** MigrationConstruct props */
export type MigrationConstructProps = StackProps & {
  configuration: MigrationConfiguration;
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
    const { configuration, settings } = props;

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
      configuration,
      versioning: this.versioning,
    });
  }
}
