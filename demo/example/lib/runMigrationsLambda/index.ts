import {
  getMigrationsToRun,
  getTargetVersion,
  MigrateActionResponse,
} from 'migration-helpers';

import { migrationsToRun } from './migrations';

interface HandlerResponse extends MigrateActionResponse {
  appliedMigrations: { id: number; direction?: 'up' | 'down' }[];
  error?: unknown;
}

export const handler = async ({
  currentVersion,
  targetVersion,
}: {
  currentVersion: number;
  targetVersion?: number;
}): Promise<HandlerResponse> => {
  // target version is set to be the the hightest id of the migration (i.e latest migration)
  const definedTargetVersion =
    targetVersion ?? getTargetVersion(migrationsToRun);

  const migrationsHandlers = getMigrationsToRun({
    targetVersion: definedTargetVersion,
    currentVersion,
    migrationsToRun,
  });

  const appliedMigrations: { id: number; direction?: 'up' | 'down' }[] = [
    { id: currentVersion },
  ];
  try {
    for (const migration of migrationsHandlers) {
      await migration.handler();
      appliedMigrations.push({
        id: migration.id,
        direction: migration.direction,
      });
    }
  } catch (error) {
    return {
      status: 'FAILED',
      targetVersion: definedTargetVersion,
      appliedMigrations,
      error,
    };
  }

  return {
    status: 'SUCCEEDED',
    targetVersion: definedTargetVersion,
    appliedMigrations,
  };
};
