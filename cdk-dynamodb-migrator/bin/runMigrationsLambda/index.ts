export const handler = async (input: {
  currentVersion: number;
  targetVersion?: number;
  parameters: { statusToAnswer?: string };
}): Promise<{ status: 'SUCCEEDED' | 'FAILED'; targetVersion: number }> => {
  console.log(input);

  const {
    currentVersion,
    targetVersion,
    parameters: { statusToAnswer },
  } = input;
  if (statusToAnswer === 'SUCCEEDED') {
    return await Promise.resolve({
      status: 'SUCCEEDED',
      targetVersion: targetVersion ?? currentVersion + 1,
    });
  }
  if (statusToAnswer === 'FAILED') {
    return await Promise.resolve({
      status: 'FAILED',
      targetVersion: targetVersion ?? currentVersion + 1,
    });
  }

  if (Math.random() < 0.5) {
    return await Promise.resolve({
      status: 'FAILED',
      targetVersion: targetVersion ?? currentVersion + 1,
    });
  } else {
    return await Promise.resolve({
      status: 'SUCCEEDED',
      targetVersion: targetVersion ?? currentVersion + 1,
    });
  }
};
