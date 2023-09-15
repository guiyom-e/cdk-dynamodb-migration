import {
  fetchTargetVersion,
  getMigrationsHandlersToRun,
} from 'migration-helpers';

import { migrationsToRun } from './migrations';

export const handler = async ({
  currentVersion,
  targetVersion,
}: {
  currentVersion: number;
  targetVersion?: number;
}): Promise<void> => {
  // target version is set to be the the hightest id of the migration (i.e latest migration)
  const definedTargetVersion =
    targetVersion ?? fetchTargetVersion(migrationsToRun);
  if (definedTargetVersion === undefined) {
    console.log('No migrations provided');

    return;
  }

  const migrationsHandlers = getMigrationsHandlersToRun({
    targetVersion: definedTargetVersion,
    currentVersion,
    migrationsToRun,
  });

  const migration_response = [];
  for (const migration of migrationsHandlers) {
    const response = await migration();
    migration_response.push(response);
  }
  console.log(migration_response);
};
