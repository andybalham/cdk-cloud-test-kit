/* eslint-disable import/no-extraneous-dependencies */
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
}

export interface QueryInput
  extends Omit<
    AwsQueryInput,
    'TableName' | 'KeyConditionExpression' | 'ExpressionAttributeValues'
  > {
  partitionKeyValue: string | number;
  sortKeyCriteria?:
    | {
        value: string | number;
      }
    | {
        comparison: {
          operator: SortKeyOperator;
          value: string | number;
        };
      }
    | { range: { from: string; to: string } | { from: number; to: number } };
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

export const getQueryInput = ({
  tableName,
  partitionKeyName,
  sortKeyName,
  queryInput,
}: {
  tableName: string;
  partitionKeyName: string;
  sortKeyName?: string;
  queryInput: QueryInput;
}): AwsQueryInput => {
  //
  const queryParams /*: AwsQueryInput */ = {
    ...queryInput,
    TableName: tableName,
    KeyConditionExpression: `${partitionKeyName} = :partitionKey`,
  };

  queryParams.ExpressionAttributeValues = {
    ...queryParams.ExpressionAttributeValues,
    ':partitionKey': queryInput.partitionKeyValue,
  };

  if (queryInput.sortKeyCriteria) {
    if ('value' in queryInput.sortKeyCriteria) {
      //
      const sortKeyConditionExpression = `${sortKeyName} ${SortKeyOperator.EQUALS} :sortKey`;

      queryParams.KeyConditionExpression += ` AND ${sortKeyConditionExpression}`;

      queryParams.ExpressionAttributeValues = {
        ...queryParams.ExpressionAttributeValues,
        ':sortKey': queryInput.sortKeyCriteria.value,
      };
    } else if ('comparison' in queryInput.sortKeyCriteria) {
      //
      const { operator: sortKeyOperator, value: sortKeyValue } =
        queryInput.sortKeyCriteria.comparison;

      const sortKeyConditionExpression =
        sortKeyOperator === SortKeyOperator.BEGINS_WITH
          ? `begins_with(${sortKeyName}, :sortKey)`
          : `${sortKeyName} ${sortKeyOperator} :sortKey`;

      queryParams.KeyConditionExpression += ` AND ${sortKeyConditionExpression}`;

      queryParams.ExpressionAttributeValues = {
        ...queryParams.ExpressionAttributeValues,
        ':sortKey': sortKeyValue,
      };
    } else if ('range' in queryInput.sortKeyCriteria) {
      //
      const { range } = queryInput.sortKeyCriteria;

      queryParams.KeyConditionExpression += ` AND ${sortKeyName} between :sortKeyFrom AND :sortKeyTo`;

      queryParams.ExpressionAttributeValues = {
        ...queryParams.ExpressionAttributeValues,
        ':sortKeyFrom': range.from,
        ':sortKeyTo': range.to,
      };
    }
  }

  return queryParams;
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
  //
  const queryParams = getQueryInput({
    tableName,
    partitionKeyName,
    sortKeyName,
    queryInput,
  });

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
