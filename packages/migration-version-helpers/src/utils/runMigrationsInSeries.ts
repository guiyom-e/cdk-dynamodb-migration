import { MigrateHandlerResponse, MigrationOperator } from 'types';

export type AppliedMigration<T = unknown> = {
  id: number;
  direction?: 'up' | 'down';
  result?: T;
};

export interface RunMigrationsInSeriesReturnType
  extends MigrateHandlerResponse {
  appliedMigrations: AppliedMigration[];
  error?: unknown;
}

export const runMigrationsInSeries = async <T = unknown>({
  currentVersion,
  targetVersion,
  migrationOperators,
}: {
  currentVersion: number;
  targetVersion: number;
  migrationOperators: MigrationOperator<T>[];
}): Promise<RunMigrationsInSeriesReturnType> => {
  const appliedMigrations: AppliedMigration<T>[] = [{ id: currentVersion }];

  try {
    for (const migration of migrationOperators) {
      const result = await migration.handler();
      appliedMigrations.push({
        id: migration.id,
        direction: migration.direction,
        result,
      });
    }
  } catch (error) {
    return {
      status: 'FAILED',
      targetVersion,
      appliedMigrations,
      error,
    };
  }

  return {
    status: 'SUCCEEDED',
    targetVersion,
    appliedMigrations,
  };
};
