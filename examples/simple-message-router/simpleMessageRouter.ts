/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import { SQSEvent } from 'aws-lambda/trigger/sqs';
import { SQS } from 'aws-sdk';
import { SendMessageRequest } from 'aws-sdk/clients/sqs';
import { Message } from './Message';

const sqs = new SQS();

export const handler = async (event: SQSEvent): Promise<void> => {
  //
  console.log(JSON.stringify({ event }, null, 2));

  for await (const record of event.Records) {
    //
    const numbersMessage = JSON.parse(record.body) as Message;

    const messageTotal = numbersMessage.values.reduce((total, value) => total + value, 0);

    const outputQueueUrl =
      messageTotal >= 0
        ? process.env.POSITIVE_OUTPUT_QUEUE_URL
        : process.env.NEGATIVE_OUTPUT_QUEUE_URL;

    if (outputQueueUrl === undefined) throw new Error('outputQueueUrl === undefined');

    const outputMessageRequest: SendMessageRequest = {
      QueueUrl: outputQueueUrl,
      MessageBody: JSON.stringify(numbersMessage),
    };

    const outputMessageResult = await sqs.sendMessage(outputMessageRequest).promise();

    console.log(JSON.stringify({ outputMessageResult }, null, 2));
  }
};
