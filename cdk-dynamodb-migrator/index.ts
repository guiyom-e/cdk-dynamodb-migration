import {
  MigrationStack,
  MigrationStackProps,
  MultipleMigrationsStack,
  MultipleMigrationsStackProps,
} from './lib';
import {
  CURRENT_STATUS_SORT_KEY,
  DEFAULT_MIGRATION_PARTITION_KEY,
  DEFAULT_PARTITION_KEY_NAME,
  DEFAULT_SORT_KEY_NAME,
  FAILURE_STATUS,
  SUCCESS_STATUS,
} from './lib/constants';
import {
  MigrationConstruct,
  MigrationConstructProps,
  MultipleMigrationsConstruct,
  MultipleMigrationsConstructProps,
} from './lib/constructs';
import {
  MigrationConfiguration,
  MigrationHandling,
  VersioningSettings,
} from './lib/constructs/types';

export {
  DEFAULT_PARTITION_KEY_NAME,
  DEFAULT_SORT_KEY_NAME,
  DEFAULT_MIGRATION_PARTITION_KEY,
  CURRENT_STATUS_SORT_KEY,
  SUCCESS_STATUS,
  FAILURE_STATUS,
  // Export Migration construct
  MigrationConstruct,
  MigrationConstructProps,
  // Export Multiple Migrations construct
  MultipleMigrationsConstruct,
  MultipleMigrationsConstructProps,
  // Export Migration stack
  MigrationStack,
  MigrationStackProps,
  // Export Multiple Migrations stack
  MultipleMigrationsStack,
  MultipleMigrationsStackProps,
  // Export types
  MigrationConfiguration,
  MigrationHandling,
  VersioningSettings,
};
