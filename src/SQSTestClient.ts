/* eslint-disable import/no-extraneous-dependencies */
import SQS, {
  MessageBodyAttributeMap,
  SendMessageRequest,
  SendMessageResult,
} from 'aws-sdk/clients/sqs';

export default class SQSTestClient {
  //
  readonly sqs: SQS;

  constructor(public readonly region: string, public readonly queueUrl: string) {
    this.sqs = new SQS({ region });
  }

  async sendMessageAsync(
    messageBody: Record<string, any>,
    messageAttributes?: MessageBodyAttributeMap
  ): Promise<SendMessageResult> {
    //
    const sendMessageRequest: SendMessageRequest = {
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(messageBody),
      MessageAttributes: messageAttributes,
    };

    const sendMessageResult = await this.sqs.sendMessage(sendMessageRequest).promise();

    return sendMessageResult;
  }
}
