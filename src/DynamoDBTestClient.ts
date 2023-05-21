// eslint-disable-next-line import/no-extraneous-dependencies
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
// eslint-disable-next-line import/no-extraneous-dependencies
import { AttributeValue, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { AttributeValue as StreamAttributeValue } from 'aws-lambda/trigger/dynamodb-stream';
// eslint-disable-next-line import/no-extraneous-dependencies
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { clearAllItems, getItem } from './dynamoDb';

export default class DynamoDBTestClient {
  //
  readonly db: DynamoDBDocumentClient;

  constructor(public readonly region: string, public readonly tableName: string) {
    this.db = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
  }

  async clearAllItemsAsync(): Promise<void> {
    await clearAllItems(this.region, this.tableName);
  }

  async getItemAsync<T>(key: Record<string, any> | undefined): Promise<T | undefined> {
    //
    if (key === undefined) {
      return undefined;
    }

    return getItem(this.region, this.tableName, key) as unknown as T;
  }

  async getItemByEventKeyAsync<T>(
    eventKey: { [key: string]: StreamAttributeValue } | undefined
  ): Promise<T | undefined> {
    //
    if (eventKey === undefined) {
      return undefined;
    }

    // Override: Type 'AWSLambda.AttributeValue' is not assignable to type 'DynamoDB.AttributeValue'
    const key = unmarshall(eventKey as Record<string, AttributeValue>);

    return getItem(this.region, this.tableName, key) as unknown as T;
  }
}
