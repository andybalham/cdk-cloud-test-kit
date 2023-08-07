/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import { SNSEvent } from 'aws-lambda/trigger/sns';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import * as AWSXRay from 'aws-xray-sdk';
import { Event } from './Event';

const sns = AWSXRay.captureAWSv3Client(new SNSClient({}));

export const handler = async (event: SNSEvent): Promise<void> => {
  //
  console.log(JSON.stringify({ event }, null, 2));

  if (
    process.env.POSITIVE_OUTPUT_TOPIC_ARN === undefined ||
    process.env.NEGATIVE_OUTPUT_TOPIC_ARN === undefined
  ) {
    throw new Error(
      'process.env.POSITIVE_OUTPUT_TOPIC_ARN === undefined || process.env.NEGATIVE_OUTPUT_TOPIC_ARN === undefined'
    );
  }

  for await (const record of event.Records) {
    //
    const numbersEvent = JSON.parse(record.Sns.Message) as Event;

    const eventTotal = numbersEvent.values.reduce((total, value) => total + value, 0);

    const outputTopicArn =
      eventTotal >= 0
        ? process.env.POSITIVE_OUTPUT_TOPIC_ARN
        : process.env.NEGATIVE_OUTPUT_TOPIC_ARN;

    const publishCommand = new PublishCommand({
      TopicArn: outputTopicArn,
      Message: JSON.stringify(numbersEvent),
    });

    const publishResult = await sns.send(publishCommand);

    console.log(JSON.stringify({ result: publishResult }, null, 2));
  }
};
