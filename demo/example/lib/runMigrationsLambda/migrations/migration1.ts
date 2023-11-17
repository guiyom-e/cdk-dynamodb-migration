import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { Migration } from 'migration-version-helpers';

import { DEFAULT_AWS_REGION, TABLE_NAME } from '../../constants';

const client = new DynamoDB({ region: DEFAULT_AWS_REGION });

type Result = {
  isComplete: boolean;
  count: number;
};

export const migration1: Migration = {
  id: 1,
  description: 'Add green eye color to all dinosaurs',
  up: async (): Promise<Result> => {
    console.log('MIGRATION_1_UP');

    // ⚠️ WARN: DynamoDB scan may not return all items in the table. A proper way to handle all items is to iterate while LastEvaluatedKey is not undefined.
    const dinosaursScanResult = await client.scan({ TableName: TABLE_NAME });
    console.log('DINOSAURS_1_UP', dinosaursScanResult);

    const modifiedElements = dinosaursScanResult.Items?.map((element) => ({
      ...element,
      eyeColor: { S: 'green' },
    }));

    if (modifiedElements === undefined) {
      return { isComplete: true, count: 0 };
    }

    // 💡 NB: DynamoDB batchWriteItem should be used for better performances
    // ⚠️ WARN: this method to put items in batch is not reliable, as one failure would stop the whole batch
    await Promise.all(
      modifiedElements.map((element) =>
        client.putItem({ TableName: TABLE_NAME, Item: element }),
      ),
    );

    return {
      isComplete: dinosaursScanResult.LastEvaluatedKey === undefined,
      count: dinosaursScanResult.Count ?? 0,
    };
  },
  down: async (): Promise<Result> => {
    console.log('MIGRATION_1_DOWN');
    const dinosaursScanResult = await client.scan({ TableName: TABLE_NAME });
    console.log('DINOSAURS_1_DOWN', dinosaursScanResult);

    const modifiedElements = dinosaursScanResult.Items?.map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- eyeColor is removed intentionally
      ({ eyeColor, ...rest }) => rest,
    );

    if (modifiedElements === undefined) {
      return { isComplete: true, count: 0 };
    }

    await Promise.all(
      modifiedElements.map((element) =>
        client.putItem({ TableName: TABLE_NAME, Item: element }),
      ),
    );

    return {
      isComplete: dinosaursScanResult.LastEvaluatedKey === undefined,
      count: dinosaursScanResult.Count ?? 0,
    };
  },
};
