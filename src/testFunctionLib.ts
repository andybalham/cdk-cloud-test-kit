import { nanoid } from 'nanoid';
// eslint-disable-next-line import/no-extraneous-dependencies
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import {
  CurrentTestItem,
  FunctionStateTestItem,
  ObservationTestItem,
  TestItemPrefix,
} from './TestItems';
import TestObservation from './TestObservation';
import { TestProps } from './TestProps';

const integrationTestTableName = process.env.INTEGRATION_TEST_TABLE_NAME;

export const getTestPropsAsync = async (
  documentClient: DynamoDBDocumentClient
): Promise<TestProps> => {
  //
  if (integrationTestTableName === undefined)
    throw new Error('integrationTestTableName === undefined');

  const testQueryParams /*: QueryInput */ = {
    // QueryInput results in a 'Condition parameter type does not match schema type'
    TableName: integrationTestTableName,
    KeyConditionExpression: `PK = :PK`,
    ExpressionAttributeValues: {
      ':PK': 'Current',
    },
  };

  const testQueryOutput = await documentClient.send(new QueryCommand(testQueryParams));

  if (testQueryOutput.Items?.length !== 1)
    throw new Error(
      'No current test item found in the integration test table. Are you missing a call to initialiseTestAsync?'
    );

  const currentTestItem = testQueryOutput.Items[0] as CurrentTestItem;

  return currentTestItem.props;
};

export const recordObservationAsync = async (
  documentClient: DynamoDBDocumentClient,
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

  await documentClient.send(
    new PutCommand({
      TableName: integrationTestTableName,
      Item: testOutputItem,
    })
  );
};

export const recordObservationDataAsync = async (
  documentClient: DynamoDBDocumentClient,
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
  documentClient: DynamoDBDocumentClient,
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

  await documentClient.send(
    new PutCommand({
      TableName: integrationTestTableName,
      Item: functionStateItem,
    })
  );
};

export const getFunctionStateAsync = async (
  documentClient: DynamoDBDocumentClient,
  functionId: string,
  initialState: Record<string, any>
): Promise<Record<string, any>> => {
  //
  if (integrationTestTableName === undefined)
    throw new Error('integrationTestTableName === undefined');

  const { testId } = await getTestPropsAsync(documentClient);

  const functionStateQueryParams /*: QueryInput */ = {
    // QueryInput results in a 'Condition parameter type does not match schema type'
    TableName: integrationTestTableName,
    KeyConditionExpression: `PK = :PK and SK = :SK`,
    ExpressionAttributeValues: {
      ':PK': testId,
      ':SK': `${TestItemPrefix.FunctionState}-${functionId}`,
    },
  };

  const functionStateQueryOutput = await documentClient.send(
    new QueryCommand(functionStateQueryParams)
  );

  if (functionStateQueryOutput.Items === undefined || functionStateQueryOutput.Items.length === 0) {
    return initialState;
  }

  if (functionStateQueryOutput.Items.length > 1)
    throw new Error('functionStateQueryOutput.Items.length > 1');

  const mockState = functionStateQueryOutput.Items[0].state;

  return mockState;
};
