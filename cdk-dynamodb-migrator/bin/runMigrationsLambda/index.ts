export const handler = async function ({
  statusToAnswer,
}: {
  statusToAnswer: string;
}) {
  if (statusToAnswer === 'SUCCEEDED') return { status: 'SUCCEEDED' };
  if (statusToAnswer === 'FAILED') return { status: 'FAILED' };

  if (Math.random() < 0.5) {
    return { status: 'FAILED' };
  } else {
    return { status: 'SUCCEEDED' };
  }
};
