// eslint-disable-next-line import/no-extraneous-dependencies
import AWS from 'aws-sdk';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ExecutionStatus, HistoryEvent, StartExecutionInput } from 'aws-sdk/clients/stepfunctions';
import { getLastEventAsync } from './stepFunctions';

const STEP_FUNCTION_STATE_RUNNING = 'RUNNING';

export default class StepFunctionsTestClient {
  //
  readonly stepFunctions: AWS.StepFunctions;

  executionArn: string;

  constructor(private region: string, private stateMachineArn: string) {
    this.stepFunctions = new AWS.StepFunctions({ region });
  }

  async startExecutionAsync(input: Record<string, any>): Promise<void> {
    //
    const params: StartExecutionInput = {
      stateMachineArn: this.stateMachineArn,
      input: JSON.stringify(input),
    };

    const { executionArn } = await this.stepFunctions.startExecution(params).promise();

    this.executionArn = executionArn;
  }

  async isExecutionFinishedAsync(): Promise<boolean> {
    //
    if (this.executionArn === undefined) throw new Error('this.executionArn === undefined');

    const opts = {
      maxResults: 1,
      stateMachineArn: this.stateMachineArn,
    };

    const result = await this.stepFunctions.listExecutions(opts).promise();

    const { executions } = result;

    const isExecutionFinished =
      executions &&
      executions[0] &&
      executions[0].executionArn === this.executionArn &&
      executions[0].status !== STEP_FUNCTION_STATE_RUNNING;

    return isExecutionFinished;
  }

  async getStatusAsync(): Promise<ExecutionStatus | undefined> {
    //
    if (this.executionArn === undefined) throw new Error('this.executionArn === undefined');

    const opts = {
      maxResults: 1,
      stateMachineArn: this.stateMachineArn,
    };

    const result = await this.stepFunctions.listExecutions(opts).promise();

    const { executions } = result;

    if (executions && executions[0] && executions[0].executionArn === this.executionArn) {
      return executions[0].status;
    }

    return undefined;
  }

  async getLastEventAsync(): Promise<HistoryEvent | undefined> {
    if (this.executionArn === undefined) throw new Error('this.executionArn === undefined');

    return getLastEventAsync(this.region, this.stateMachineArn, this.executionArn);
  }
}
