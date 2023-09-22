import { Migration } from 'migration-helpers';

import { migration_1 } from './migration_1';
import { migration_2 } from './migration_2';

export const migrationsToRun: Migration[] = [migration_1, migration_2];
