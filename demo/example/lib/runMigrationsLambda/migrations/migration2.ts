import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { Migration } from 'migration-version-helpers';

import { DEFAULT_AWS_REGION, TABLE_NAME } from '../../constants';

const client = new DynamoDB({ region: DEFAULT_AWS_REGION });

export const migration2: Migration = {
  id: 2,
  description: 'Change eye color to list for all dinosaurs',
  up: async (): Promise<void> => {
    console.log('MIGRATION_2_UP');

    const dinosaursScanResult = await client.scan({ TableName: TABLE_NAME });
    console.log('DINOSAURS_2_UP', dinosaursScanResult);

    const modifiedElements = dinosaursScanResult.Items?.map((item) => ({
      ...item,
      eyeColors: { L: item.eyeColor !== undefined ? [item.eyeColor] : [] },
    }));

    if (modifiedElements === undefined) {
      return;
    }

    await Promise.all(
      modifiedElements.map((element) =>
        client.putItem({ TableName: TABLE_NAME, Item: element }),
      ),
    );
  },
  down: async (): Promise<void> => {
    console.log('MIGRATION_2_DOWN');

    const dinosaursScanResult = await client.scan({ TableName: TABLE_NAME });
    console.log('DINOSAURS_2_DOWN', dinosaursScanResult);

    const modifiedElements = dinosaursScanResult.Items?.map((item) => ({
      ...item,
      ...(item.eyeColors?.L?.[0]
        ? {
            eyeColor: item.eyeColors.L[0],
          }
        : {}),
    }));

    if (modifiedElements === undefined) {
      return;
    }

    await Promise.all(
      modifiedElements.map((element) =>
        client.putItem({ TableName: TABLE_NAME, Item: element }),
      ),
    );
  },
};
