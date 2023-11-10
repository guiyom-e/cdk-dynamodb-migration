import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { Migration } from 'migration-version-helpers';

const client = new DynamoDB({ region: 'eu-west-1' });

export const migration1: Migration = {
  id: 1,
  up: async (): Promise<{ status: string }> => {
    console.log('MIGRATION_1_UP');

    try {
      const elements = await client.scan({ TableName: 'Dinosaurs' });
      console.log('ELEMENTS_1_UP', elements);

      const modifiedElements = elements.Items?.map((element) => ({
        ...element,
        eyeColor: { S: 'green' },
      }));

      if (modifiedElements === undefined) {
        return { status: 'SUCCEEDED' };
      }
      await Promise.all(
        modifiedElements.map((element) =>
          client.putItem({ TableName: 'Dinosaurs', Item: element }),
        ),
      );
    } catch (err) {
      console.log('ERROR', err);

      return Promise.resolve({ status: 'FAILED' });
    }

    // Modify the element and put it back in db
    return { status: 'SUCCEEDED' };
  },
  down: async (): Promise<{ status: string }> => {
    console.log('MIGRATION_1_DOWN');
    try {
      const elements = await client.scan({ TableName: 'Dinosaurs' });
      console.log('ELEMENTS down', elements);

      const modifiedElements = elements.Items?.map(
        ({ eyeColor, ...rest }) => rest,
      );

      if (modifiedElements === undefined) {
        return { status: 'SUCCEEDED' };
      }
      await Promise.all(
        modifiedElements.map((element) =>
          client.putItem({ TableName: 'Dinosaurs', Item: element }),
        ),
      );
    } catch (err) {
      console.log('ERROR down', err);

      return Promise.resolve({ status: 'FAILED' });
    }

    return Promise.resolve({ status: 'SUCCEEDED' });
  },
};
