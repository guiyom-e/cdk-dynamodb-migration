import { MigrateActionResponseProps, Migration } from 'migration-helpers';

export const migration_162815072023: Migration = {
  id: 162815072023,
  up: async (): Promise<MigrateActionResponseProps> => {
    console.log('Some up migration happening here', 162815072023);

    return Promise.resolve({
      status: Math.random() < 0.01 ? 'SUCCEEDED' : 'FAILED',
    });
  },
  down: async (): Promise<MigrateActionResponseProps> => {
    console.log('Some down migration happening here', 162815072023);

    return Promise.resolve({ status: 'SUCCEEDED' });
  },
};
