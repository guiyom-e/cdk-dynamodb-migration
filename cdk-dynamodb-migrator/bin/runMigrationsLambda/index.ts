export const handler = async ({
  statusToAnswer,
}: {
  statusToAnswer: string;
}): Promise<{ status: 'SUCCEEDED' | 'FAILED' }> => {
  if (statusToAnswer === 'SUCCEEDED') {
    return await Promise.resolve({ status: 'SUCCEEDED' });
  }
  if (statusToAnswer === 'FAILED') {
    return await Promise.resolve({ status: 'FAILED' });
  }

  if (Math.random() < 0.5) {
    return await Promise.resolve({ status: 'FAILED' });
  } else {
    return await Promise.resolve({ status: 'SUCCEEDED' });
  }
};
