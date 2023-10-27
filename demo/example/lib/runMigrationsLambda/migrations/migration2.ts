import { Migration } from 'migration-helpers';

export const migration2: Migration = {
  id: 2,
  up: async (): Promise<{ status: string }> => {
    console.log('Some up migration happening here', 2);

    return Promise.resolve({
      status: Math.random() > 0.001 ? 'SUCCEEDED' : 'FAILED',
    });
  },
  down: async (): Promise<{ status: string }> => {
    console.log('Some down migration happening here', 2);

    return Promise.resolve({
      status: Math.random() > 0.5 ? 'SUCCEEDED' : 'FAILED',
    });
  },
};
