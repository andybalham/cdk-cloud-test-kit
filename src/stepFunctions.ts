// Original copied from https://github.com/erezrokah/aws-testing-library

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  SFNClient,
  ListExecutionsCommand,
  HistoryEvent,
  GetExecutionHistoryCommand,
  StopExecutionCommand,
} from '@aws-sdk/client-sfn';

const getExecutions = async (region: string, stateMachineArn: string, statusFilter?: string) => {
  const sfnClient = new SFNClient({ region });
  const opts = {
    maxResults: 1,
    stateMachineArn,
    ...(statusFilter && { statusFilter }),
  };
  const result = await sfnClient.send(new ListExecutionsCommand(opts));

  const { executions } = result;

  return executions;
};

const RUNNING = 'RUNNING';

export const getEventName = (event: HistoryEvent) => {
  const defaultDetails = {
    name: undefined,
  };
  const { name } =
    event.stateEnteredEventDetails || event.stateExitedEventDetails || defaultDetails;
  return name;
};

export const getCurrentState = async (region: string, stateMachineArn: string) => {
  const executions = await getExecutions(region, stateMachineArn, RUNNING);
  if (executions && executions.length > 0) {
    const newestRunning = executions[0]; // the first is the newest one

    const sfnClient = new SFNClient({ region });
    const { executionArn } = newestRunning;
    const { events } = await sfnClient.send(
      new GetExecutionHistoryCommand({ executionArn, reverseOrder: true, maxResults: 1 })
    );
    if (events && events.length > 0) {
      const newestEvent = events[0];
      const name = getEventName(newestEvent);
      return name;
    }
    return undefined;
  }
  return undefined;
};

export const getStates = async (region: string, stateMachineArn: string) => {
  const executions = await getExecutions(region, stateMachineArn);
  if (executions && executions.length > 0) {
    const newestRunning = executions[0]; // the first is the newest one

    const sfnClient = new SFNClient({ region });
    const { executionArn } = newestRunning;
    const { events } = await sfnClient.send(
      new GetExecutionHistoryCommand({ executionArn, reverseOrder: true })
    );
    const names = (events ?? []).map((event) => getEventName(event)).filter((name) => !!name);
    return names;
  }
  return [];
};

export const stopRunningExecutions = async (region: string, stateMachineArn: string) => {
  const sfnClient = new SFNClient({ region });
  const executions = (await getExecutions(region, stateMachineArn, RUNNING)) ?? [];

  await Promise.all(
    executions.map(({ executionArn }) => sfnClient.send(new StopExecutionCommand({ executionArn })))
  );
};

export const getLastEventAsync = async (
  region: string,
  stateMachineArn: string,
  executionArn: string
): Promise<HistoryEvent | undefined> => {
  //
  const executions = ((await getExecutions(region, stateMachineArn)) ?? []).filter(
    (e) => e.executionArn === executionArn
  );

  if (executions.length > 0) {
    //
    const sfnClient = new SFNClient({ region });

    const { events } = await sfnClient.send(
      new GetExecutionHistoryCommand({ executionArn, reverseOrder: true, maxResults: 1 })
    );

    if (events && events.length > 0) {
      return events[0];
    }

    return undefined;
  }

  return undefined;
};
