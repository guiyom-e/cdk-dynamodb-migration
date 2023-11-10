import { Migration } from 'migration-version-helpers';

import { migration1 } from './migration1';
import { migration2 } from './migration2';

export const migrationsToRun: Migration[] = [migration1, migration2];
