import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { Migration } from 'migration-helpers';

const client = new DynamoDB({ region: 'eu-west-1' });

export const migration_1: Migration = {
  id: 1,
  up: async (): Promise<{ status: string }> => {
    try {
      const elements = client.scan({ TableName: 'Dinosaurs' });
      console.log('ELEMENTS', elements);
    } catch (err) {
      console.log('ERROR', err);
    }
    console.log('Some up migration happening here', 1);

    return Promise.resolve({
      status: Math.random() < 0.01 ? 'SUCCEEDED' : 'FAILED',
    });
  },
  down: async (): Promise<{ status: string }> => {
    console.log('Some down migration happening here', 1);

    return Promise.resolve({ status: 'SUCCEEDED' });
  },
};
