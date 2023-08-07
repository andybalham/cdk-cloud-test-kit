import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import {
  aws_sqs as sqs,
  aws_lambda as lambda,
  aws_lambda_event_sources as lambdaEventSources,
  aws_lambda_nodejs as lambdaNodejs,
} from 'aws-cdk-lib';
import path from 'path';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';

export interface SimpleMessageRouterProps {
  inputQueue: sqs.IQueue;
}

export default class SimpleMessageRouterConstruct extends Construct {
  //
  readonly positiveOutputQueue: sqs.IQueue;

  readonly positiveOutputDLQ: sqs.IQueue;

  readonly negativeOutputQueue: sqs.IQueue;

  readonly negativeOutputDLQ: sqs.IQueue;

  constructor(scope: Construct, id: string, props: SimpleMessageRouterProps) {
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
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: path.join(__dirname, '.', 'simpleMessageRouter.ts'),
        handler: 'handler',
        tracing: lambda.Tracing.ACTIVE,
        environment: {
          INPUT_QUEUE_URL: props.inputQueue.queueUrl,
          POSITIVE_OUTPUT_QUEUE_URL: this.positiveOutputQueue.queueUrl,
          NEGATIVE_OUTPUT_QUEUE_URL: this.negativeOutputQueue.queueUrl,
        },
        logRetention: RetentionDays.ONE_DAY,
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
