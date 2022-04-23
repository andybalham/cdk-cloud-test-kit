/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import { SNSEvent } from 'aws-lambda/trigger/sns';
import { SNS } from 'aws-sdk';
import { PublishInput } from 'aws-sdk/clients/sns';
import { Event } from './Event';

const sns = new SNS();

export const handler = async (event: SNSEvent): Promise<void> => {
  //
  console.log(JSON.stringify({ event }, null, 2));

  for await (const record of event.Records) {
    //
    const numbersEvent = JSON.parse(record.Sns.Message) as Event;

    const eventTotal = numbersEvent.values.reduce((total, value) => total + value, 0);

    const outputTopicArn =
      eventTotal >= 0
        ? process.env.POSITIVE_OUTPUT_TOPIC_ARN
        : process.env.NEGATIVE_OUTPUT_TOPIC_ARN;

    if (outputTopicArn === undefined) throw new Error('outputTopicArn === undefined');

    const outputEventRequest: PublishInput = {
      TopicArn: outputTopicArn,
      Message: JSON.stringify(numbersEvent),
    };

    const outputEventResult = await sns.publish(outputEventRequest).promise();

    console.log(JSON.stringify({ outputEventResult }, null, 2));
  }
};
