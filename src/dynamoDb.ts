// Copied from https://github.com/erezrokah/aws-testing-library

/* eslint-disable array-callback-return */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  AttributeValue,
  DescribeTableCommand,
  DynamoDBClient,
  KeySchemaElement,
} from '@aws-sdk/client-dynamodb';
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  DynamoDBDocumentClient,
  GetCommand,
  BatchWriteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';

const newDocumentClient = (region: string): DynamoDBDocumentClient =>
  DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

const itemToKey = (item: Record<string, AttributeValue>, keySchema: KeySchemaElement[]) => {
  let itemKey: Record<string, AttributeValue> = {};
  keySchema.map((key) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    itemKey = { ...itemKey, [key.AttributeName!]: item[key.AttributeName!] };
  });
  return itemKey;
};

export const clearAllItems = async (region: string, tableName: string) => {
  // get the table keys
  const dynamoDBClient = new DynamoDBClient({ region });
  const { Table = {} } = await dynamoDBClient.send(
    new DescribeTableCommand({ TableName: tableName })
  );

  const keySchema = Table.KeySchema || [];

  // get the items to delete
  const documentClient = newDocumentClient(region);
  const scanResult = await documentClient.send(
    new ScanCommand({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      AttributesToGet: keySchema.map((key) => key.AttributeName!),
      TableName: tableName,
    })
  );
  const items = scanResult.Items || [];

  if (items.length > 0) {
    const deleteRequests = items.map((item) => ({
      DeleteRequest: { Key: itemToKey(item, keySchema) },
    }));

    await documentClient.send(
      new BatchWriteCommand({ RequestItems: { [tableName]: deleteRequests } })
    );
  }
};

export const writeItems = async (
  region: string,
  tableName: string,
  items: Record<string, AttributeValue>[]
) => {
  const documentClient = newDocumentClient(region);
  const writeRequests = items.map((item) => ({
    PutRequest: { Item: item },
  }));

  await documentClient.send(
    new BatchWriteCommand({ RequestItems: { [tableName]: writeRequests } })
  );
};

export const getItem = async (
  region: string,
  tableName: string,
  key: Record<string, AttributeValue>
) => {
  const documentClient = newDocumentClient(region);
  const dbItem = await documentClient.send(new GetCommand({ TableName: tableName, Key: key }));
  // Item is undefined if key not found
  return dbItem.Item;
};
