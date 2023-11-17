import { Migration } from 'types';

/** Get the highest migration id (i.e latest migration) from the available migrations */
export const getTargetVersion = <T = unknown>(
  migrations: Migration<T>[],
): number =>
  migrations.reduce((acc, migration) => {
    if (migration.id > acc) {
      return migration.id;
    }

    return acc;
  }, 0);
