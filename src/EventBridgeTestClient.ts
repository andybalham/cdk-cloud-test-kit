/* eslint-disable import/no-extraneous-dependencies */
import AWS from 'aws-sdk';
import {
  PutEventsRequest,
  PutEventsRequestEntry,
  PutEventsResponse,
} from 'aws-sdk/clients/eventbridge';

export default class EventBridgeTestClient {
  //
  readonly eventBridge: AWS.EventBridge;

  constructor(public readonly region: string, public readonly eventBusArn: string) {
    this.eventBridge = new AWS.EventBridge({ region });
  }

  async putEventAsync(entry: PutEventsRequestEntry): Promise<PutEventsResponse> {
    const response = await this.putEventsAsync([entry]);
    return response;
  }

  async putEventsAsync(entries: PutEventsRequestEntry[]): Promise<PutEventsResponse> {
    //
    const request: PutEventsRequest = {
      Entries: entries.map((e) => ({
        ...e,
        EventBusName: this.eventBusArn,
      })),
    };

    const response = await this.eventBridge.putEvents(request).promise();
    return response;
  }
}
