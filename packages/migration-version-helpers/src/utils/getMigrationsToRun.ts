import { Migration, MigrationFunction, MigrationOperator } from 'types';

type MigrationUp<T = unknown> = Migration<T> & { up: MigrationFunction<T> };
type MigrationDown<T = unknown> = Migration<T> & { down: MigrationFunction<T> };

const isMigrationUp = <T = unknown>(
  migration: Migration<T>,
): migration is MigrationUp<T> => {
  return migration.up !== undefined;
};

const isMigrationDown = <T = unknown>(
  migration: Migration<T>,
): migration is MigrationDown<T> => {
  return migration.down !== undefined;
};

export const getMigrationsToRun = <T = unknown>({
  migrationsToRun,
  targetVersion,
  currentVersion,
}: {
  migrationsToRun: Migration<T>[];
  targetVersion: number;
  currentVersion: number;
}): MigrationOperator<T>[] => {
  if (currentVersion < targetVersion) {
    return migrationsToRun
      .filter((migration) => migration.id <= targetVersion)
      .filter(isMigrationUp)
      .map((migration) => ({
        id: migration.id,
        handler: migration.up,
        direction: 'up',
      }));
  } else if (currentVersion > targetVersion) {
    return migrationsToRun
      .filter((migration) => migration.id >= targetVersion)
      .filter(isMigrationDown)
      .map((migration) => ({
        id: migration.id,
        handler: migration.down,
        direction: 'down',
      }));
  } else {
    return [];
  }
};
