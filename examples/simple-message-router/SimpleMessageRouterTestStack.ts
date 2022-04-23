import * as cdk from '@aws-cdk/core';
import * as sqs from '@aws-cdk/aws-sqs';
import { IntegrationTestStack } from '../../src';
import SimpleMessageRouterConstruct from './SimpleMessageRouterConstruct';

export default class SimpleMessageRouterTestStack extends IntegrationTestStack {
  //
  static readonly Id = `SimpleRouterTestStack`;

  static readonly TestInputQueueId = 'TestInputQueue';

  static readonly PositiveOutputQueueConsumerId = 'PositiveOutputQueueConsumerFunction';

  static readonly PositiveOutputDLQConsumerId = 'PositiveOutputDLQConsumerFunction';

  static readonly NegativeOutputQueueConsumerId = 'NegativeOutputQueueConsumerFunction';

  static readonly NegativeOutputDLQConsumerId = 'NegativeOutputDLQConsumerFunction';

  constructor(scope: cdk.Construct, id: string) {
    //
    super(scope, id, {
      testStackId: SimpleMessageRouterTestStack.Id,
      testFunctionIds: [
        SimpleMessageRouterTestStack.PositiveOutputDLQConsumerId,
        SimpleMessageRouterTestStack.NegativeOutputDLQConsumerId,
        SimpleMessageRouterTestStack.PositiveOutputQueueConsumerId,
        SimpleMessageRouterTestStack.NegativeOutputQueueConsumerId,
      ],
    });

    const testInputQueue = new sqs.Queue(this, SimpleMessageRouterTestStack.TestInputQueueId, {
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      visibilityTimeout: cdk.Duration.seconds(3),
    });

    this.addTestResourceTag(testInputQueue, SimpleMessageRouterTestStack.TestInputQueueId);

    const sut = new SimpleMessageRouterConstruct(this, 'SimpleMessageRouter', {
      inputQueue: testInputQueue,
    });

    this.addSQSQueueConsumer(
      sut.positiveOutputQueue,
      SimpleMessageRouterTestStack.PositiveOutputQueueConsumerId
    );

    this.addSQSQueueConsumer(
      sut.positiveOutputDLQ,
      SimpleMessageRouterTestStack.PositiveOutputDLQConsumerId
    );

    this.addSQSQueueConsumer(
      sut.negativeOutputQueue,
      SimpleMessageRouterTestStack.NegativeOutputQueueConsumerId
    );

    this.addSQSQueueConsumer(
      sut.negativeOutputDLQ,
      SimpleMessageRouterTestStack.NegativeOutputDLQConsumerId
    );
  }
}
