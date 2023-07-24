/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import { APIGatewayEvent } from 'aws-lambda';
import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsRequest,
  PutEventsRequestEntry,
} from '@aws-sdk/client-eventbridge';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { customAlphabet } from 'nanoid';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as AWSXRay from 'aws-xray-sdk';
import {
  EventDomain,
  EventDetailType,
  LoanApplicationSubmitted,
  EventService,
} from './domain-events';

export const BUCKET_NAME = 'BUCKET_NAME';
export const EVENT_BUS_NAME = 'EVENT_BUS_NAME';

const s3Client = new S3Client({});
const bucketName = process.env[BUCKET_NAME];

const eventBridgeClient = AWSXRay.captureAWSv3Client(new EventBridgeClient({}));
const eventBusName = process.env[EVENT_BUS_NAME];

const nanoid = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 16);

export const handler = async (event: APIGatewayEvent): Promise<any> => {
  console.log(JSON.stringify({ event }, null, 2));

  if (event.body === null) {
    return {
      statusCode: 400, // Bad Request
    };
  }

  // Generate the id and reference

  const correlationId = nanoid();
  const loanApplicationReference = getLoanApplicationReference();

  // Store the body and get a pre-signed URL

  const s3Params = {
    Bucket: bucketName,
    Key: `${loanApplicationReference}/loan-application.json`,
  };

  await s3Client.send(
    new PutObjectCommand({
      ...s3Params,
      ACL: 'bucket-owner-full-control',
      Body: event.body,
    })
  );

  // https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html
  // https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html

  const signedCommand = new GetObjectCommand(s3Params);
  const loanApplicationDetailsUrl = await getSignedUrl(s3Client, signedCommand, {
    expiresIn: 5 * 60, // 5 minutes
  });

  // Publish the event to process the application

  const loanApplicationSubmitted: LoanApplicationSubmitted = {
    metadata: {
      correlationId,
      domain: EventDomain.LoanBroker,
      service: EventService.RequestApi,
    },
    data: {
      loanApplicationReference,
      loanApplicationDetailsUrl,
    },
  };

  console.log(JSON.stringify({ loanApplicationSubmitted }, null, 2));

  const requestEntry: PutEventsRequestEntry = {
    Source: `${loanApplicationSubmitted.metadata.domain}.${loanApplicationSubmitted.metadata.service}`,
    DetailType: EventDetailType.LoanApplicationSubmitted,
    Detail: JSON.stringify(loanApplicationSubmitted),
    EventBusName: eventBusName,
  };

  const request: PutEventsRequest = {
    Entries: [requestEntry],
  };

  const response = await eventBridgeClient.send(new PutEventsCommand(request));
  console.log(JSON.stringify({ response }, null, 2));

  // Return the reference

  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicationReference: loanApplicationReference }),
  };
};

function getLoanApplicationReference(): string {
  const todayDateString = new Date().toISOString().slice(0, 10);
  const reference = `${todayDateString}-${nanoid().slice(0, 9)}`;
  return reference;
}
