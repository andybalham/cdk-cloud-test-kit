/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import { EventBridgeEvent } from 'aws-lambda/trigger/eventbridge';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import fetch from 'node-fetch';
import TestFunctionClient from '../../src/TestFunctionClient';
import { LoanApplicationSubmitted } from './domain-events';
import { LoanApplicationDetails } from './domain-models';

const testFunctionClient = new TestFunctionClient(new DocumentClient());

export const handler = async (
  event: EventBridgeEvent<'LoanApplicationSubmitted', LoanApplicationSubmitted>
): Promise<any> => {
  console.log(JSON.stringify({ event }, null, 2));

  const fetchResponse = await fetch(event.detail.data.loanApplicationDetailsUrl);
  const loanApplicationDetails: LoanApplicationDetails = await fetchResponse.json();

  await testFunctionClient.recordObservationDataAsync({
    actualEventDetail: event.detail,
    actualLoanApplicationDetails: loanApplicationDetails,
  });
};
