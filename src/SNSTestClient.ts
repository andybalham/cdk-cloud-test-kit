// eslint-disable-next-line import/no-extraneous-dependencies
import {
  MessageAttributeValue,
  PublishCommand,
  PublishInput,
  SNSClient,
} from '@aws-sdk/client-sns';

export default class SNSTestClient {
  //
  readonly sns: SNSClient;

  constructor(public readonly region: string, public readonly topicArn: string) {
    this.sns = new SNSClient({ region });
  }

  async publishEventAsync(
    message: Record<string, any>,
    messageAttributes?: Record<string, MessageAttributeValue>
  ): Promise<void> {
    //
    const publishInput: PublishInput = {
      Message: JSON.stringify(message),
      TopicArn: this.topicArn,
      MessageAttributes: messageAttributes,
    };

    await this.sns.send(new PublishCommand(publishInput));
  }
}
