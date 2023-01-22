/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable max-classes-per-file */
import {
  DocumentClient,
  Key,
  PutItemInput,
  QueryInput as AwsQueryInput,
} from 'aws-sdk/clients/dynamodb';

export enum SortKeyOperator {
  EQUALS = '=',
  LESS_THAN = '<',
  LESS_THAN_OR_EQUAL = '<=',
  GREATER_THAN_OR_EQUAL = '>=',
  GREATER_THAN = '>',
  BEGINS_WITH = 'BEGINS_WITH',
  BETWEEN = 'BETWEEN',
}

export interface QueryInput
  extends Omit<
    AwsQueryInput,
    'TableName' | 'KeyConditionExpression' | 'ExpressionAttributeValues'
  > {
  partitionKeyValue: string | number;
  sortKeyOperator?: SortKeyOperator;
  sortKeyValue?: string | number;
  sortKeyRange?: { from: string; to: string } | { from: number; to: number };
  ExpressionAttributeValues?: Record<string, any>;
}

export const putItemAsync = async ({
  documentClient,
  tableName,
  item,
}: {
  documentClient: DocumentClient;
  tableName: string;
  item: Record<string, any>;
}): Promise<void> => {
  const putItem: PutItemInput = {
    TableName: tableName,
    Item: item,
  };

  await documentClient.put(putItem).promise();
};

export const queryItemsAsync = async <T>({
  documentClient,
  tableName,
  partitionKeyName,
  sortKeyName,
  queryInput,
}: {
  documentClient: DocumentClient;
  tableName: string;
  partitionKeyName: string;
  sortKeyName?: string;
  queryInput: QueryInput;
}): Promise<T[]> => {
  const queryParams /*: AwsQueryInput */ = {
    ...queryInput,
    TableName: tableName,
    KeyConditionExpression: `${partitionKeyName} = :partitionKey`,
  };

  queryParams.ExpressionAttributeValues = {
    ...queryParams.ExpressionAttributeValues,
    ':partitionKey': queryInput.partitionKeyValue,
  };

  if (queryInput.sortKeyValue) {
    //
    const sortKeyConditionExpression =
      queryInput.sortKeyOperator === SortKeyOperator.BEGINS_WITH
        ? `BEGINS_WITH(${sortKeyName}, :sortKey)`
        : `${sortKeyName} ${queryInput.sortKeyOperator ?? SortKeyOperator.EQUALS} :sortKey`;

    queryParams.KeyConditionExpression += `AND ${sortKeyConditionExpression}`;

    queryParams.ExpressionAttributeValues = {
      ...queryParams.ExpressionAttributeValues,
      ':sortKey': queryInput.partitionKeyValue,
    };
  } else if (queryInput.sortKeyRange) {
    //
    const sortKeyConditionExpression = `${sortKeyName} ${
      queryInput.sortKeyOperator ?? SortKeyOperator.BETWEEN
    } :sortKeyFrom AND :sortKeyTo`;

    queryParams.KeyConditionExpression += `AND ${sortKeyConditionExpression}`;

    queryParams.ExpressionAttributeValues = {
      ...queryParams.ExpressionAttributeValues,
      ':sortKeyFrom': queryInput.sortKeyRange.from,
      ':sortKeyTo': queryInput.sortKeyRange.to,
    };
  }

  let concatenatedItems: T[] = [];
  let lastEvaluatedKey: Key | undefined;

  do {
    queryParams.ExclusiveStartKey = lastEvaluatedKey;

    // eslint-disable-next-line no-await-in-loop
    const queryOutput = await documentClient.query(queryParams).promise();

    const queryItems = queryOutput.Items?.map((i) => i as T) ?? [];

    concatenatedItems = concatenatedItems.concat(queryItems);

    lastEvaluatedKey = queryOutput.LastEvaluatedKey;
    //
  } while (lastEvaluatedKey !== undefined);

  return concatenatedItems;
};
