import {
  getMigrationsToRun,
  getTargetVersion,
  MigrateHandlerResponse,
  runMigrationsInSeries,
} from 'migration-version-helpers';

import { migrationsToRun } from './migrations';

interface HandlerResponse extends MigrateHandlerResponse {
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
  const definedTargetVersion =
    targetVersion ?? getTargetVersion(migrationsToRun);

  const migrationOperators = getMigrationsToRun({
    targetVersion: definedTargetVersion,
    currentVersion,
    migrationsToRun,
  });

  const result = await runMigrationsInSeries({
    currentVersion,
    targetVersion: definedTargetVersion,
    migrationOperators,
  });

  return result;
};
