/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import TestFunctionClient from './TestFunctionClient';

const testFunctionClient = new TestFunctionClient();

const functionId = process.env.FUNCTION_ID;

export const handler = async (
  event: Record<string, any>
): Promise<Record<string, any> | undefined> => {
  //
  console.log(JSON.stringify({ event }, null, 2));

  if (functionId === undefined) throw new Error('functionId === undefined');

  await testFunctionClient.recordObservationAsync({
    observerId: functionId,
    timestamp: Date.now(),
    data: event,
  });

  const { mockResponses } = await testFunctionClient.getTestPropsAsync();

  if (mockResponses === undefined) {
    console.log(`No mock responses defined, so returning undefined`);
    return undefined;
  }

  const state = (await testFunctionClient.getFunctionStateAsync(functionId, {
    invocationCount: 0,
  })) as { invocationCount: number };

  state.invocationCount += 1;

  await testFunctionClient.setFunctionStateAsync(functionId, state);

  const functionResponses = mockResponses[functionId];

  if (functionResponses === undefined) {
    console.log(`No mock responses defined for id '${functionId}', so returning undefined`);
    return undefined;
  }

  let failSafe = 0;

  let mockResponseCount = 0;
  let mockResponseIndex = 0;

  while (
    mockResponseCount < state.invocationCount &&
    mockResponseIndex < functionResponses.length
  ) {
    //
    failSafe += 1;
    if (failSafe > 1000) {
      throw new Error(`failSafe: ${failSafe}`);
    }

    const mockResponse = functionResponses[mockResponseIndex];

    if (mockResponse.repeat === 'FOREVER') {
      break;
    }

    mockResponseCount += mockResponse.repeat ?? 1;

    if (mockResponseCount < state.invocationCount) {
      mockResponseIndex += 1;
    }
  }

  if (mockResponseIndex >= functionResponses.length) {
    console.log(`Exhausted mock responses for id '${functionId}', so returning undefined`);
    return undefined;
  }

  const mockResponse = functionResponses[mockResponseIndex];

  const { error, payload: responsePayload } = mockResponse;

  if (error) {
    throw new Error(error);
  }

  console.log(JSON.stringify({ responsePayload }, null, 2));

  return responsePayload;
};
