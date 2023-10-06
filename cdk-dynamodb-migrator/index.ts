import { MigrationStack, MigrationStackProps } from './lib';
import {
  CURRENT_STATUS_SORT_KEY,
  DEFAULT_MIGRATION_PARTITION_KEY,
  DEFAULT_PARTITION_KEY_NAME,
  DEFAULT_SORT_KEY_NAME,
  FAILURE_STATUS,
  SUCCESS_STATUS,
} from './lib/constants';
import { MigrationConstruct, MigrationConstructProps } from './lib/constructs';
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
  // Export Migration stack
  MigrationStack,
  MigrationStackProps,
  // Export types
  MigrationConfiguration,
  MigrationHandling,
  VersioningSettings,
};
