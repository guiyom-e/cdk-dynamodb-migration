import { Migration } from 'types';

export const getTargetVersion = (
  migrations: Migration[],
): number | undefined => {
  if (migrations.length === 0) {
    return undefined; // No migrations provided
  }

  return migrations.reduce((acc, migration) => {
    if (migration.id > acc) {
      return migration.id;
    }

    return acc;
  }, 0);
};
