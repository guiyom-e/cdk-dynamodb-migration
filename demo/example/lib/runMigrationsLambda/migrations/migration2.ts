import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { Migration } from 'migration-version-helpers';

const client = new DynamoDB({ region: 'eu-west-1' });

export const migration2: Migration = {
  id: 2,
  up: async (): Promise<{ status: string }> => {
    console.log('MIGRATION_2_UP');
    try {
      const elements = await client.scan({ TableName: 'Dinosaurs' });

      const modifiedElements = elements.Items?.map(({ eyeColor, ...rest }) => ({
        ...rest,
        eyeColor: { L: [eyeColor ?? { S: 'yellow' }] },
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
    console.log('Some up migration happening here', 1);

    // Modify the element and put it back in db
    return { status: 'SUCCEEDED' };
  },
  down: async (): Promise<{ status: string }> => {
    console.log('MIGRATION_2_DOWN');

    try {
      const elements = await client.scan({ TableName: 'Dinosaurs' });
      console.log('ELEMENTS down', elements.Items);

      const modifiedElements = elements.Items?.map((eyeColor, ...rest) => ({
        ...rest,
        // @ts-expect-error AttributeValue type is not correct
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        ...(eyeColor.L?.[0]
          ? {
              eyeColor: { S: eyeColor.L[0].S },
            }
          : {}),
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
      console.log('ERROR down', err);

      return Promise.resolve({ status: 'FAILED' });
    }
    console.log('Some up migration happening here', 1);

    return Promise.resolve({ status: 'SUCCEEDED' });
  },
};
