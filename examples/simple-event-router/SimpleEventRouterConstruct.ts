import { Construct } from 'constructs';
import {
  aws_sns as sns,
  aws_sns_subscriptions as snsSubs,
  aws_lambda as lambda,
  aws_lambda_nodejs as lambdaNodejs,
} from 'aws-cdk-lib';
import path from 'path';

export interface SimpleEventRouterProps {
  inputTopic: sns.ITopic;
}

export default class SimpleEventRouterConstruct extends Construct {
  //
  readonly positiveOutputTopic: sns.ITopic;

  readonly negativeOutputTopic: sns.ITopic;

  constructor(scope: Construct, id: string, props: SimpleEventRouterProps) {
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
