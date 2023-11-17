import {
  SFNClient,
  StartExecutionCommand,
  StartExecutionCommandInput,
} from '@aws-sdk/client-sfn';
import * as cfnresponse from 'cfn-response';

const startStateMachine = async (input: Record<string, unknown>) => {
  const sfnClient = new SFNClient();

  const params: StartExecutionCommandInput = {
    stateMachineArn: String(process.env.SFN_ARN),
    input: JSON.stringify(input),
    // name: "STRING_VALUE",
    // traceHeader: "STRING_VALUE",
  };

  const command = new StartExecutionCommand(params);

  // let attempt = 0;
  let retry = false;
  do {
    try {
      const response = await sfnClient.send(command);
      console.debug('Response: ' + JSON.stringify(response));
      retry = false;
    } catch (error: any) {
      console.error(error);
      throw error;
      // if (error.retryable && attempt < DEFAULT_MAX_RETRY_ATTEMPTS) {
      // 	console.error(JSON.stringify(error));
      // 	retry = true;
      // 	attempt = attempt + 1;
      // 	await exponentialBackoffDelay(attempt, 5000);
      // } else {
      // 	retry = false;
      // 	throw error;
      // }
    }
  } while (retry);
};

/**
 * Send response back to cloudformation
 * @param event
 * @param context
 * @param response
 */
const sendResponse = async (event: any, context: any, response: any) => {
  await new Promise(() =>
    cfnresponse.send(
      event,
      context,
      response.Status,
      response.Data,
      response.PhysicalResourceId,
      false,
    ),
  );
};

/**
 * Lambda handler
 */
export const handler = async (event: any, context: any) => {
  let response;
  try {
    console.info(JSON.stringify(event));
    if (
      event.RequestType == 'Create' ||
      event.RequestType == 'Update' ||
      event.RequestType == 'Delete'
    ) {
      await startStateMachine({});
    }
  } catch (ex: any) {
    console.error(JSON.stringify(ex));
    response = {
      PhysicalResourceId: event?.PhysicalResourceId,
      Data: {},
      Status: cfnresponse.FAILED,
    };
  }
  // Send response back to cloudformation
  await sendResponse(event, context, response);

  return response;
};
