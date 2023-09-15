import { MigrateActionResponseProps, Migration } from 'migration-helpers';

export const migration_163315072023: Migration = {
  id: 163315072023,
  up: async (): Promise<MigrateActionResponseProps> => {
    console.log('Some up migration happening here', 163315072023);

    return Promise.resolve({
      status: Math.random() > 0.001 ? 'SUCCEEDED' : 'FAILED',
    });
  },
  down: async (): Promise<MigrateActionResponseProps> => {
    console.log('Some down migration happening here', 163315072023);

    return Promise.resolve({
      status: Math.random() > 0.5 ? 'SUCCEEDED' : 'FAILED',
    });
  },
};
