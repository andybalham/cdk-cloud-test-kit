/* eslint-disable import/no-extraneous-dependencies */
import { DynamoDBRecord } from 'aws-lambda';
import AWS from 'aws-sdk';
import {
  DynamoDBTableClient,
  DynamoDBTableClientFactory,
} from '../@andybalham/aws-helpers/DynamoDBTableClient';

export default class DynamoDBTestClient {
  //
  readonly tableClient: DynamoDBTableClient;

  constructor(public readonly region: string, public readonly tableName: string) {
    this.tableClient = new DynamoDBTableClientFactory().build({
      region,
      tableName,
      documentClient: new AWS.DynamoDB.DocumentClient({ region }),
    });
  }

  async clearAllItemsAsync(): Promise<void> {
    await this.tableClient.deleteAllItemsAsync();
  }

  async getItemAsync<T>(key: Record<string, any> | undefined): Promise<T | undefined> {
    return this.tableClient.getItemAsync<T>(key);
  }

  async getItemByEventRecordAsync<T>(record: DynamoDBRecord): Promise<T | undefined> {
    return this.tableClient.getItemByEventRecordAsync(record);
  }
}
