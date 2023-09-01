import {
  MigrateActionInputProps,
  MigrateActionResponseProps,
  Migration,
} from 'migration-helpers';

const migration: Migration = {
  up: async ({
    version,
  }: MigrateActionInputProps): Promise<MigrateActionResponseProps> => {
    return Promise.resolve({
      version,
      status: Math.random() < 0.5 ? 'SUCCEEDED' : 'FAILED',
    });
  },
  down: async ({ version }): Promise<MigrateActionResponseProps> => {
    return Promise.resolve({ version, status: 'SUCCEEDED' });
  },
};

export const handler = async ({
  up = true,
}: {
  up?: boolean;
}): Promise<void> => {
  if (up) {
    await migration.up({ version: 6 });
  } else {
    await migration.down({ version: 6 });
  }
};
