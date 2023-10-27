import { Migration } from 'types';

export const getTargetVersion = (migrations: Migration[]): number =>
  migrations.reduce((acc, migration) => {
    if (migration.id > acc) {
      return migration.id;
    }

    return acc;
  }, 0);
