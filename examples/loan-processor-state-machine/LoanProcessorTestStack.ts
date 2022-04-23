/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import * as sqs from '@aws-cdk/aws-sqs';
import * as sns from '@aws-cdk/aws-sns';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { IntegrationTestStack } from '../../src';
import LoanProcessorStateMachine from './LoanProcessorStateMachine';
import writeGraphJson from './writeGraphJson';
import { LoanTableSchema } from './ExternalContracts';

export default class LoanProcessorTestStack extends IntegrationTestStack {
  //
  static readonly Id = `LoanProcessorTestStack`;

  static readonly CreditRatingFunctionId = 'CreditRatingFunction';

  static readonly LoanTableId = 'LoanTable';

  static readonly LoanTableSubscriberId = 'LoanTableSubscriber';

  static readonly ErrorQueueId = 'ErrorQueue';

  static readonly DeclinedEventSubscriberId = 'DeclinedEventSubscriber';

  static readonly ErrorQueueConsumerId = 'ErrorQueueConsumer';

  static readonly LoanProcessorStateMachineId = 'LoanProcessorStateMachine';

  constructor(scope: cdk.Construct, id: string) {
    //
    super(scope, id, {
      testStackId: LoanProcessorTestStack.Id,
      testFunctionIds: [
        LoanProcessorTestStack.CreditRatingFunctionId,
        LoanProcessorTestStack.LoanTableSubscriberId,
        LoanProcessorTestStack.DeclinedEventSubscriberId,
        LoanProcessorTestStack.ErrorQueueConsumerId,
      ],
    });

    // Loan table and subscriber

    const loanTable = new dynamodb.Table(this, LoanProcessorTestStack.LoanTableId, {
      ...LoanTableSchema,
      ...{
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        stream: dynamodb.StreamViewType.KEYS_ONLY,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      },
    });

    this.addTestResourceTag(loanTable, LoanProcessorTestStack.LoanTableId);

    this.addDynamoDBTableEventSource(loanTable, LoanProcessorTestStack.LoanTableSubscriberId);

    // Declined topic and subscriber

    const declinedTopic = new sns.Topic(this, 'DeclinedTopic');

    this.addSNSTopicSubscriber(declinedTopic, LoanProcessorTestStack.DeclinedEventSubscriberId);

    // Error queue and consumer

    const errorQueue = new sqs.Queue(this, 'ErrorQueue', {
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      visibilityTimeout: cdk.Duration.seconds(3),
    });

    this.addSQSQueueConsumer(errorQueue, LoanProcessorTestStack.ErrorQueueConsumerId);

    // SUT

    const sut = new LoanProcessorStateMachine(
      this,
      LoanProcessorTestStack.LoanProcessorStateMachineId,
      {
        creditRatingFunction: this.testFunctions[LoanProcessorTestStack.CreditRatingFunctionId],
        loanTable,
        declinedTopic,
        errorQueue,
      }
    );

    this.addTestResourceTag(sut, LoanProcessorTestStack.LoanProcessorStateMachineId);

    writeGraphJson(sut);
  }
}
