/* eslint-disable import/no-extraneous-dependencies */
import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsRequest,
  PutEventsRequestEntry,
  PutEventsResponse,
} from '@aws-sdk/client-eventbridge';

export default class EventBridgeTestClient {
  //
  readonly eventBridge: EventBridgeClient;

  constructor(public readonly region: string, public readonly eventBusArn: string) {
    this.eventBridge = new EventBridgeClient({ region });
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

    const response = await this.eventBridge.send(new PutEventsCommand(request));
    return response;
  }
}
