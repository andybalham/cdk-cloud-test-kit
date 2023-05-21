/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsRequest,
  PutEventsRequestEntry,
  PutEventsResponse,
} from '@aws-sdk/client-eventbridge';
import { CaseEvent } from './ExternalContracts';

const eventBridgeClient = new EventBridgeClient({});

export const handler = async (caseEvent: CaseEvent): Promise<PutEventsResponse> => {
  console.log(JSON.stringify({ caseEvent }, null, 2));

  const requestEntry: PutEventsRequestEntry = {
    Source: `lender.${caseEvent.lenderId}`,
    DetailType: caseEvent.eventType,
    Detail: JSON.stringify(caseEvent),
    EventBusName: process.env.EVENT_BUS_NAME,
  };

  const request: PutEventsRequest = {
    Entries: [requestEntry],
  };

  const response = await eventBridgeClient.send(new PutEventsCommand(request));
  console.log(JSON.stringify({ response }, null, 2));
  return response;
};
