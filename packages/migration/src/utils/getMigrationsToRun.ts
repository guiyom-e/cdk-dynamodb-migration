import { Migration, MigrationHandler } from 'types';

type MigrationUp = Migration & { up: MigrationHandler };
type MigrationDown = Migration & { down: MigrationHandler };

const isMigrationUp = (migration: Migration): migration is MigrationUp => {
  return migration.up !== undefined;
};

const isMigrationDown = (migration: Migration): migration is MigrationDown => {
  return migration.down !== undefined;
};

export const getMigrationsToRun = ({
  migrationsToRun,
  targetVersion,
  currentVersion,
}: {
  migrationsToRun: Migration[];
  targetVersion: number;
  currentVersion: number;
}): MigrationHandler[] => {
  if (currentVersion < targetVersion) {
    return migrationsToRun
      .filter((migration) => migration.id <= targetVersion)
      .filter(isMigrationUp)
      .map((migration) => migration.up);
  } else if (currentVersion > targetVersion) {
    return migrationsToRun
      .filter((migration) => migration.id >= targetVersion)
      .filter(isMigrationDown)
      .map((migration) => migration.down);
  } else {
    return [];
  }
};
