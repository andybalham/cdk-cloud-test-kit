/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import { SQSEvent } from 'aws-lambda/trigger/sqs';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import * as AWSXRay from 'aws-xray-sdk';
import { Message } from './Message';

const sqs = AWSXRay.captureAWSv3Client(new SQSClient({}));

export const handler = async (event: SQSEvent): Promise<void> => {
  //
  console.log(JSON.stringify({ event }, null, 2));

  if (
    process.env.POSITIVE_OUTPUT_QUEUE_URL === undefined ||
    process.env.NEGATIVE_OUTPUT_QUEUE_URL === undefined
  ) {
    throw new Error(
      'process.env.POSITIVE_OUTPUT_QUEUE_URL === undefined || process.env.NEGATIVE_OUTPUT_QUEUE_URL === undefined'
    );
  }

  for await (const record of event.Records) {
    //
    const numbersMessage = JSON.parse(record.body) as Message;

    const messageTotal = numbersMessage.values.reduce((total, value) => total + value, 0);

    const outputQueueUrl =
      messageTotal >= 0
        ? process.env.POSITIVE_OUTPUT_QUEUE_URL
        : process.env.NEGATIVE_OUTPUT_QUEUE_URL;

    const sendMessageCommand = new SendMessageCommand({
      QueueUrl: outputQueueUrl,
      MessageBody: JSON.stringify(numbersMessage),
    });

    const sendMessageResponse = await sqs.send(sendMessageCommand);

    console.log(JSON.stringify({ response: sendMessageResponse }, null, 2));

    // // Send an SQS message using v3 sdk
    // const sendMessageRequest: AWS_SQS.SendMessageRequest = {
    //   QueueUrl: outputQueueUrl,
    //   MessageBody: JSON.stringify(numbersMessage),

    // };
    // await sqs.sendMessage(sendMessageRequest);

    // const outputMessageRequest: AWS_SQS.SendMessageCommandInput = {
    //   QueueUrl: outputQueueUrl,
    //   MessageBody: JSON.stringify(numbersMessage),
    // };

    // const outputMessageResult = await sqs.sendMessage(outputMessageRequest);

    // console.log(JSON.stringify({ outputMessageResult }, null, 2));
  }
};
