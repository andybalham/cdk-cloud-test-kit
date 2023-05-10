// eslint-disable-next-line import/no-extraneous-dependencies
import {
  ExecutionStatus,
  HistoryEvent,
  ListExecutionsCommand,
  SFNClient,
  StartExecutionCommand,
  StartExecutionInput,
} from '@aws-sdk/client-sfn';
import { getLastEventAsync } from './stepFunctions';

const STEP_FUNCTION_STATE_RUNNING = 'RUNNING';

export default class StepFunctionsTestClient {
  //
  readonly sfnClient: SFNClient;

  executionArn: string | undefined;

  constructor(private region: string, private stateMachineArn: string) {
    this.sfnClient = new SFNClient({ region });
  }

  async startExecutionAsync(input: Record<string, any>): Promise<void> {
    //
    const params: StartExecutionInput = {
      stateMachineArn: this.stateMachineArn,
      input: JSON.stringify(input),
    };

    const { executionArn } = await this.sfnClient.send(new StartExecutionCommand(params));

    if (executionArn === undefined) throw new Error('executionArn === undefined');

    this.executionArn = executionArn;
  }

  async isExecutionFinishedAsync(): Promise<boolean> {
    //
    if (this.executionArn === undefined) throw new Error('this.executionArn === undefined');

    const opts = {
      maxResults: 1,
      stateMachineArn: this.stateMachineArn,
    };

    const result = await this.sfnClient.send(new ListExecutionsCommand(opts));

    const { executions } = result;

    const isExecutionFinished =
      executions !== undefined &&
      executions.length > 0 &&
      executions[0]?.executionArn === this.executionArn &&
      executions[0]?.status !== STEP_FUNCTION_STATE_RUNNING;

    return isExecutionFinished;
  }

  async getStatusAsync(): Promise<ExecutionStatus | string | undefined> {
    //
    if (this.executionArn === undefined) throw new Error('this.executionArn === undefined');

    const opts = {
      maxResults: 1,
      stateMachineArn: this.stateMachineArn,
    };

    const result = await this.sfnClient.send(new ListExecutionsCommand(opts));

    const { executions } = result;

    if (executions && executions.length > 0 && executions[0]?.executionArn === this.executionArn) {
      return executions[0].status;
    }

    return undefined;
  }

  async getLastEventAsync(): Promise<HistoryEvent | undefined> {
    if (this.executionArn === undefined) throw new Error('this.executionArn === undefined');

    return getLastEventAsync(this.region, this.stateMachineArn, this.executionArn);
  }
}
