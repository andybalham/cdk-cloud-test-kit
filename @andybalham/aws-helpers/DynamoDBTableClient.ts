/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable max-classes-per-file */
import { DynamoDBRecord } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Converter, DocumentClient, Key } from 'aws-sdk/clients/dynamodb';
import { Agent } from 'https';
import { putItemAsync, QueryInput, queryItemsAsync } from './dynamodb-helpers';

const agent = new Agent({
  keepAlive: true,
});

const documentClient = new DocumentClient({
  httpOptions: {
    agent,
  },
});

export interface DynamoDBTableProps {
  partitionKeyName: string;
  sortKeyName: string;
}

export interface DynamoDBTableClientProps {
  region?: string;
  tableName?: string;
  dynamoDBTableProps?: DynamoDBTableProps;
  documentClient?: DocumentClient;
}

/**
 * Provides a wrapper around `DocumentClient` for a specific table.
 */
export class DynamoDBTableClient {
  documentClient: DocumentClient;

  constructor(public readonly props: DynamoDBTableClientProps) {
    this.documentClient = props.documentClient ?? documentClient;
  }

  public get tableName(): string {
    if (this.props.tableName === undefined) {
      throw new Error('this.props.tableName === undefined');
    }
    return this.props.tableName;
  }

  public get partitionKeyName(): string {
    if (this.props.dynamoDBTableProps?.partitionKeyName === undefined) {
      throw new Error('this.props.dynamoDBTableProps?.partitionKeyName === undefined');
    }
    return this.props.dynamoDBTableProps.partitionKeyName;
  }

  public get sortKeyName(): string {
    if (this.props.dynamoDBTableProps?.sortKeyName === undefined) {
      throw new Error('this.props.dynamoDBTableProps?.sortKeyName === undefined');
    }
    return this.props.dynamoDBTableProps.sortKeyName;
  }

  async putItemAsync(item: Record<string, any>): Promise<void> {
    await putItemAsync({ documentClient: this.documentClient, tableName: this.tableName, item });
  }

  async queryItemsAsync<T>(queryInput: QueryInput): Promise<T[]> {
    return queryItemsAsync<T>({
      documentClient: this.documentClient,
      tableName: this.tableName,
      partitionKeyName: this.partitionKeyName,
      sortKeyName: this.sortKeyName,
      queryInput,
    });
  }

  async getItemAsync<T>(key?: Record<string, any>): Promise<T | undefined> {
    if (key === undefined) {
      return undefined;
    }

    const dbItem = await this.documentClient.get({ TableName: this.tableName, Key: key }).promise();

    // Item is undefined if key not found
    return dbItem.Item as T;
  }

  async getItemByEventRecordAsync<T>(record: DynamoDBRecord): Promise<T | undefined> {
    //
    const eventKey = record.dynamodb?.Keys;

    if (eventKey === undefined) {
      return undefined;
    }

    const key = Converter.unmarshall(eventKey);

    return this.getItemAsync(key) as unknown as T;
  }

  static itemToKey(
    item: AWS.DynamoDB.DocumentClient.AttributeMap,
    keySchema: AWS.DynamoDB.KeySchemaElement[]
  ): AWS.DynamoDB.DocumentClient.Key {
    let itemKey: AWS.DynamoDB.DocumentClient.Key = {};
    // eslint-disable-next-line array-callback-return
    keySchema.map((key) => {
      itemKey = { ...itemKey, [key.AttributeName]: item[key.AttributeName] };
    });
    return itemKey;
  }

  async deleteAllItemsAsync(): Promise<void> {
    // get the table keys
    const dynamoDB = new AWS.DynamoDB({ region: this.props.region });
    const { Table: tableDescription = {} } = await dynamoDB
      .describeTable({ TableName: this.tableName })
      .promise();

    const keySchema = tableDescription.KeySchema || [];

    let lastEvaluatedKey: Key | undefined;

    do {
      // https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html
      const maxBatchWriteItemCount = 25;

      // eslint-disable-next-line no-await-in-loop
      const scanResult = await this.documentClient
        .scan({
          AttributesToGet: keySchema.map((key) => key.AttributeName),
          TableName: this.tableName,
          Limit: maxBatchWriteItemCount,
          ExclusiveStartKey: lastEvaluatedKey,
        })
        .promise();

      const items = scanResult.Items || [];

      if (items.length > 0) {
        const deleteRequests = items.map((item) => ({
          DeleteRequest: { Key: DynamoDBTableClient.itemToKey(item, keySchema) },
        }));

        // eslint-disable-next-line no-await-in-loop
        await this.documentClient
          .batchWrite({ RequestItems: { [this.tableName]: deleteRequests } })
          .promise();
      }

      lastEvaluatedKey = scanResult.LastEvaluatedKey;
      //
    } while (lastEvaluatedKey !== undefined);
  }
}

/**
 * A factory for building clients for a specific DynamoDB table.
 */
export class DynamoDBTableClientFactory {
  constructor(public readonly props?: DynamoDBTableProps) {}

  // https://jsdoc.app/tags-param.html#parameters-with-properties
  build({
    region,
    tableName,
    documentClient: documentClientOverride,
  }: {
    region?: string;
    tableName?: string;
    documentClient?: DocumentClient;
  } = {}): DynamoDBTableClient {
    return new DynamoDBTableClient({
      region,
      tableName,
      documentClient: documentClientOverride,
      dynamoDBTableProps: this.props,
    });
  }
}
