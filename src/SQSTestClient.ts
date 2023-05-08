// eslint-disable-next-line import/no-extraneous-dependencies
import {
  MessageAttributeValue,
  SQSClient,
  SendMessageCommand,
  SendMessageCommandInput,
  SendMessageCommandOutput,
} from '@aws-sdk/client-sqs';

export default class SQSTestClient {
  //
  readonly sqs: SQSClient;

  constructor(public readonly region: string, public readonly queueUrl: string) {
    this.sqs = new SQSClient({ region });
  }

  async sendMessageAsync(
    messageBody: Record<string, any>,
    messageAttributes?: Record<string, MessageAttributeValue>
  ): Promise<SendMessageCommandOutput> {
    //
    const sendMessageRequest: SendMessageCommandInput = {
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(messageBody),
      MessageAttributes: messageAttributes,
    };

    const sendMessageResult = await this.sqs.send(new SendMessageCommand(sendMessageRequest));

    return sendMessageResult;
  }
}
