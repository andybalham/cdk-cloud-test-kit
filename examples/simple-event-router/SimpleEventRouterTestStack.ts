import * as cdk from '@aws-cdk/core';
import * as sns from '@aws-cdk/aws-sns';
import { IntegrationTestStack } from '../../src';
import SimpleEventRouterConstruct from './SimpleEventRouterConstruct';

export default class SimpleEventRouterTestStack extends IntegrationTestStack {
  //
  static readonly Id = `SimpleEventRouterTestStack`;

  static readonly TestInputTopicId = 'TestInputTopic';

  static readonly PositiveOutputTopicSubscriberId = 'PositiveOutputTopicSubscriberFunction';

  static readonly NegativeOutputTopicSubscriberId = 'NegativeOutputTopicSubscriberFunction';

  constructor(scope: cdk.Construct, id: string) {
    //
    super(scope, id, {
      testStackId: SimpleEventRouterTestStack.Id,
      testFunctionIds: [
        SimpleEventRouterTestStack.PositiveOutputTopicSubscriberId,
        SimpleEventRouterTestStack.NegativeOutputTopicSubscriberId,
      ],
    });

    const testInputTopic = new sns.Topic(this, SimpleEventRouterTestStack.TestInputTopicId);

    this.addTestResourceTag(testInputTopic, SimpleEventRouterTestStack.TestInputTopicId);

    const sut = new SimpleEventRouterConstruct(this, 'SUT', {
      inputTopic: testInputTopic,
    });

    this.addSNSTopicSubscriber(
      sut.positiveOutputTopic,
      SimpleEventRouterTestStack.PositiveOutputTopicSubscriberId
    );

    this.addSNSTopicSubscriber(
      sut.negativeOutputTopic,
      SimpleEventRouterTestStack.NegativeOutputTopicSubscriberId
    );
  }
}
