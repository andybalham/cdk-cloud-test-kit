import * as cdk from '@aws-cdk/core';
// eslint-disable-next-line import/no-extraneous-dependencies
import * as sqs from '@aws-cdk/aws-sqs';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaEventSources from '@aws-cdk/aws-lambda-event-sources';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import path from 'path';

export interface SimpleMessageRouterProps {
  inputQueue: sqs.IQueue;
}

export default class SimpleMessageRouterConstruct extends cdk.Construct {
  //
  readonly positiveOutputQueue: sqs.IQueue;

  readonly positiveOutputDLQ: sqs.IQueue;

  readonly negativeOutputQueue: sqs.IQueue;

  readonly negativeOutputDLQ: sqs.IQueue;

  constructor(scope: cdk.Construct, id: string, props: SimpleMessageRouterProps) {
    super(scope, id);

    const outputQueueProps: sqs.QueueProps = {
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      visibilityTimeout: cdk.Duration.seconds(3),
    };

    this.positiveOutputDLQ = new sqs.Queue(this, 'PositiveOutputDLQ');

    this.positiveOutputQueue = new sqs.Queue(this, 'PositiveOutputQueue', {
      ...outputQueueProps,
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: this.positiveOutputDLQ,
      },
    });

    this.negativeOutputDLQ = new sqs.Queue(this, 'NegativeOutputDLQ');

    this.negativeOutputQueue = new sqs.Queue(this, 'NegativeOutputQueue', {
      ...outputQueueProps,
      deadLetterQueue: {
        maxReceiveCount: 2,
        queue: this.negativeOutputDLQ,
      },
    });

    const simpleMessageRouterFunction = new lambdaNodejs.NodejsFunction(
      scope,
      'SimpleMessageRouterFunction',
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        entry: path.join(__dirname, '.', 'simpleMessageRouter.ts'),
        handler: 'handler',
        environment: {
          INPUT_QUEUE_URL: props.inputQueue.queueUrl,
          POSITIVE_OUTPUT_QUEUE_URL: this.positiveOutputQueue.queueUrl,
          NEGATIVE_OUTPUT_QUEUE_URL: this.negativeOutputQueue.queueUrl,
        },
      }
    );

    props.inputQueue.grantConsumeMessages(simpleMessageRouterFunction);
    simpleMessageRouterFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(props.inputQueue)
    );

    this.positiveOutputQueue.grantSendMessages(simpleMessageRouterFunction);
    this.negativeOutputQueue.grantSendMessages(simpleMessageRouterFunction);
  }
}
