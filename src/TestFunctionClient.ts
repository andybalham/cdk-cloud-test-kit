/* eslint-disable class-methods-use-this */
// eslint-disable-next-line import/no-extraneous-dependencies
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
// import { nanoid } from 'nanoid';
import {
  getFunctionStateAsync,
  getTestPropsAsync,
  recordObservationAsync,
  recordObservationDataAsync,
  setFunctionStateAsync,
} from './testFunctionLib';
// import {
//   CurrentTestItem,
//   FunctionStateTestItem,
//   ObservationTestItem,
//   TestItemPrefix,
// } from './TestItems';
import TestObservation from './TestObservation';
import { TestProps } from './TestProps';

// const integrationTestTableName = process.env.INTEGRATION_TEST_TABLE_NAME;

export default class TestFunctionClient {
  //
  constructor(public documentClient: DocumentClient) {}

  async getTestPropsAsync(): Promise<TestProps> {
    //
    return getTestPropsAsync(documentClient);

    // if (integrationTestTableName === undefined)
    //   throw new Error('integrationTestTableName === undefined');

    // const testQueryParams /*: QueryInput */ = {
    //   // QueryInput results in a 'Condition parameter type does not match schema type'
    //   TableName: integrationTestTableName,
    //   KeyConditionExpression: `PK = :PK`,
    //   ExpressionAttributeValues: {
    //     ':PK': 'Current',
    //   },
    // };

    // const testQueryOutput = await documentClient.query(testQueryParams).promise();

    // if (testQueryOutput.Items?.length !== 1)
    //   throw new Error(
    //     'No current test item found in the integration test table. Are you missing a call to initialiseTestAsync?'
    //   );

    // const currentTestItem = testQueryOutput.Items[0] as CurrentTestItem;

    // return currentTestItem.props;
  }

  async recordObservationDataAsync(data: Record<string, any>): Promise<void> {
    //
    await recordObservationDataAsync(documentClient, data);

    // const functionId = process.env.FUNCTION_ID;

    // if (functionId === undefined) throw new Error('functionId === undefined');

    // await this.recordObservationAsync({
    //   observerId: functionId,
    //   timestamp: Date.now(),
    //   data,
    // });
  }

  async recordObservationAsync(observation: TestObservation): Promise<void> {
    //
    await recordObservationAsync(documentClient, observation);

    // if (integrationTestTableName === undefined)
    //   throw new Error('integrationTestTableName === undefined');

    // const { testId } = await this.getTestPropsAsync();

    // const now = Date.now().toString().slice(6);

    // const testOutputItem: ObservationTestItem = {
    //   PK: testId,
    //   SK: `${TestItemPrefix.TestObservation}-${now}-${nanoid(10)}`,
    //   observation,
    // };

    // await documentClient
    //   .put({
    //     TableName: integrationTestTableName,
    //     Item: testOutputItem,
    //   })
    //   .promise();
  }

  async getFunctionStateAsync(
    functionId: string,
    initialState: Record<string, any>
  ): Promise<Record<string, any>> {
    //
    return getFunctionStateAsync(documentClient, functionId, initialState);

    // if (integrationTestTableName === undefined)
    //   throw new Error('integrationTestTableName === undefined');

    // const { testId } = await this.getTestPropsAsync();

    // const functionStateQueryParams /*: QueryInput */ = {
    //   // QueryInput results in a 'Condition parameter type does not match schema type'
    //   TableName: integrationTestTableName,
    //   KeyConditionExpression: `PK = :PK and SK = :SK`,
    //   ExpressionAttributeValues: {
    //     ':PK': testId,
    //     ':SK': `${TestItemPrefix.FunctionState}-${functionId}`,
    //   },
    // };

    // const functionStateQueryOutput = await documentClient.query(functionStateQueryParams).promise();

    // if (
    //   functionStateQueryOutput.Items === undefined ||
    //   functionStateQueryOutput.Items.length === 0
    // ) {
    //   return initialState;
    // }

    // if (functionStateQueryOutput.Items.length > 1)
    //   throw new Error('functionStateQueryOutput.Items.length > 1');

    // const mockState = functionStateQueryOutput.Items[0].state;

    // return mockState;
  }

  async setFunctionStateAsync(functionId: string, state: Record<string, any>): Promise<void> {
    //
    await setFunctionStateAsync(documentClient, functionId, state);

    // if (integrationTestTableName === undefined)
    //   throw new Error('integrationTestTableName === undefined');

    // const { testId } = await this.getTestPropsAsync();

    // const functionStateItem: FunctionStateTestItem = {
    //   PK: testId,
    //   SK: `${TestItemPrefix.FunctionState}-${functionId}`,
    //   state,
    // };

    // await documentClient
    //   .put({
    //     TableName: integrationTestTableName,
    //     Item: functionStateItem,
    //   })
    //   .promise();
  }
}
