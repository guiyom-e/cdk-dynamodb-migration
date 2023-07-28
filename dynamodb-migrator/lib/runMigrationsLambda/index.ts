export const handler = async function () {
  if (Math.random() < 0.5) {
    return { status: 'FAILED' };
  } else {
    return { status: 'SUCCEEDED' };
  }
};
