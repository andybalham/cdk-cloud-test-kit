/* eslint-disable class-methods-use-this */
// eslint-disable-next-line import/no-extraneous-dependencies
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import {
  getFunctionStateAsync,
  getTestPropsAsync,
  recordObservationAsync,
  recordObservationDataAsync,
  setFunctionStateAsync,
} from './testFunctionLib';
import TestObservation from './TestObservation';
import { TestProps } from './TestProps';

// const integrationTestTableName = process.env.INTEGRATION_TEST_TABLE_NAME;

const documentClient = new DocumentClient();

export default class TestFunctionClient {
  //
  async getTestPropsAsync(): Promise<TestProps> {
    return getTestPropsAsync(documentClient);
  }

  async recordObservationDataAsync(data: Record<string, any>): Promise<void> {
    await recordObservationDataAsync(documentClient, data);
  }

  async recordObservationAsync(observation: TestObservation): Promise<void> {
    await recordObservationAsync(documentClient, observation);
  }

  async getFunctionStateAsync(
    functionId: string,
    initialState: Record<string, any>
  ): Promise<Record<string, any>> {
    return getFunctionStateAsync(documentClient, functionId, initialState);
  }

  async setFunctionStateAsync(functionId: string, state: Record<string, any>): Promise<void> {
    await setFunctionStateAsync(documentClient, functionId, state);
  }
}
