/* eslint-disable import/no-extraneous-dependencies */
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { nanoid } from 'nanoid';
import { putItemAsync, queryItemsAsync } from './@andybalham/aws-helpers/dynamodb-helpers';
import { FunctionStateTestItem, ObservationTestItem, TestItemPrefix } from './TestItems';
import TestObservation from './TestObservation';
import { TestProps } from './TestProps';

const integrationTestTableName = process.env.INTEGRATION_TEST_TABLE_NAME;

export const getTestPropsAsync = async (documentClient: DocumentClient): Promise<TestProps> => {
  //
  if (integrationTestTableName === undefined)
    throw new Error('integrationTestTableName === undefined');

  const currentTestItems = await queryItemsAsync<Record<string, any>>({
    documentClient,
    tableName: integrationTestTableName,
    partitionKeyName: 'PK',
    queryInput: {
      partitionKeyValue: 'Current',
    },
  });

  if (currentTestItems.length !== 1)
    throw new Error(
      'No current test item found in the integration test table. Are you missing a call to initialiseTestAsync?'
    );

  return currentTestItems[0].props;
};

export const recordObservationAsync = async (
  documentClient: DocumentClient,
  observation: TestObservation
): Promise<void> => {
  //
  if (integrationTestTableName === undefined)
    throw new Error('integrationTestTableName === undefined');

  const { testId } = await getTestPropsAsync(documentClient);

  const now = Date.now().toString().slice(6);

  const testOutputItem: ObservationTestItem = {
    PK: testId,
    SK: `${TestItemPrefix.TestObservation}-${now}-${nanoid(10)}`,
    observation,
  };

  await putItemAsync({
    documentClient,
    tableName: integrationTestTableName,
    item: testOutputItem,
  });
};

export const recordObservationDataAsync = async (
  documentClient: DocumentClient,
  data: Record<string, any>
): Promise<void> => {
  //
  const functionId = process.env.FUNCTION_ID;

  if (functionId === undefined) throw new Error('functionId === undefined');

  await recordObservationAsync(documentClient, {
    observerId: functionId,
    timestamp: Date.now(),
    data,
  });
};

export const setFunctionStateAsync = async (
  documentClient: DocumentClient,
  functionId: string,
  state: Record<string, any>
): Promise<void> => {
  //
  if (integrationTestTableName === undefined)
    throw new Error('integrationTestTableName === undefined');

  const { testId } = await getTestPropsAsync(documentClient);

  const functionStateItem: FunctionStateTestItem = {
    PK: testId,
    SK: `${TestItemPrefix.FunctionState}-${functionId}`,
    state,
  };

  await putItemAsync({
    documentClient,
    tableName: integrationTestTableName,
    item: functionStateItem,
  });
};

export const getFunctionStateAsync = async (
  documentClient: DocumentClient,
  functionId: string,
  initialState: Record<string, any>
): Promise<Record<string, any>> => {
  //
  if (integrationTestTableName === undefined)
    throw new Error('integrationTestTableName === undefined');

  const { testId } = await getTestPropsAsync(documentClient);

  const functionStateItems = await queryItemsAsync<Record<string, any>>({
    documentClient,
    tableName: integrationTestTableName,
    partitionKeyName: 'PK',
    sortKeyName: 'SK',
    queryInput: {
      partitionKeyValue: testId,
      sortKeyCriteria: { value: `${TestItemPrefix.FunctionState}-${functionId}` },
    },
  });

  if (functionStateItems.length === 0) {
    return initialState;
  }

  if (functionStateItems.length > 1) throw new Error('functionStateItems.length > 1');

  const mockState = functionStateItems[0].state;

  return mockState;
};
