import {
  getMigrationsToRun,
  getTargetVersion,
  MigrateActionResponseProps,
} from 'migration-helpers';

import { migrationsToRun } from './migrations';

export const handler = async ({
  currentVersion,
  targetVersion,
}: {
  currentVersion: number;
  targetVersion?: number;
}): Promise<MigrateActionResponseProps> => {
  // target version is set to be the the hightest id of the migration (i.e latest migration)
  const definedTargetVersion =
    targetVersion ?? getTargetVersion(migrationsToRun);
  if (definedTargetVersion === undefined) {
    console.log('No migrations provided');

    return {
      status: 'SUCCEEDED',
      targetVersion: currentVersion,
    };
  }

  const migrationsHandlers = getMigrationsToRun({
    targetVersion: definedTargetVersion,
    currentVersion,
    migrationsToRun,
  });

  const migration_response = [];
  for (const migration of migrationsHandlers) {
    const response = await migration();
    migration_response.push(response);
  }

  return {
    status: migration_response[0]?.status ?? 'SUCCEEDED',
    targetVersion: definedTargetVersion,
  };
};
