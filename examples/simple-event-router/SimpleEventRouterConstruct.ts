import * as cdk from '@aws-cdk/core';
import * as sns from '@aws-cdk/aws-sns';
import * as snsSubs from '@aws-cdk/aws-sns-subscriptions';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import path from 'path';

export interface SimpleEventRouterProps {
  inputTopic: sns.ITopic;
}

export default class SimpleEventRouterConstruct extends cdk.Construct {
  //
  readonly positiveOutputTopic: sns.ITopic;

  readonly negativeOutputTopic: sns.ITopic;

  constructor(scope: cdk.Construct, id: string, props: SimpleEventRouterProps) {
    super(scope, id);

    const outputTopicProps = {};

    this.positiveOutputTopic = new sns.Topic(this, 'PositiveOutputTopic', outputTopicProps);

    this.negativeOutputTopic = new sns.Topic(this, 'NegativeOutputTopic', outputTopicProps);

    const simpleEventRouterFunction = new lambdaNodejs.NodejsFunction(
      scope,
      'SimpleEventRouterFunction',
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        entry: path.join(__dirname, '.', 'simpleEventRouter.ts'),
        handler: 'handler',
        environment: {
          INPUT_TOPIC_ARN: props.inputTopic.topicArn,
          POSITIVE_OUTPUT_TOPIC_ARN: this.positiveOutputTopic.topicArn,
          NEGATIVE_OUTPUT_TOPIC_ARN: this.negativeOutputTopic.topicArn,
        },
      }
    );

    props.inputTopic.addSubscription(new snsSubs.LambdaSubscription(simpleEventRouterFunction));

    this.positiveOutputTopic.grantPublish(simpleEventRouterFunction);
    this.negativeOutputTopic.grantPublish(simpleEventRouterFunction);
  }
}
