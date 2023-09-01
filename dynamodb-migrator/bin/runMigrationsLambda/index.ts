import { Migration } from '../../../packages/migration';

export const handler = async function ({ up = true }: { up?: boolean }) {
  if (up) {
    migration.up({ version: 6 });
  } else {
    migration.down({ version: 6 });
  }
};

export const migration: Migration = {
  up: async function ({ version }) {
    return { version, status: Math.random() < 0.5 ? 'SUCCEEDED' : 'FAILED' };
  },
  down: async function ({ version }) {
    return { version, status: 'SUCCEEDED' };
  },
};
