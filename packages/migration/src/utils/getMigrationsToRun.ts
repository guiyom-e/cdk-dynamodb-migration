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
}): {
  id: number;
  handler: MigrationHandler;
  direction: 'up' | 'down';
}[] => {
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
