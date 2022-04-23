/* eslint-disable import/no-extraneous-dependencies */
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import StateMachineBuilder from '@andybalham/state-machine-builder';
import StateMachineWithGraph from '@andybalham/state-machine-with-graph';
import * as cdk from '@aws-cdk/core';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as sfnTasks from '@aws-cdk/aws-stepfunctions-tasks';
import * as lambda from '@aws-cdk/aws-lambda';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as sns from '@aws-cdk/aws-sns';
import * as sqs from '@aws-cdk/aws-sqs';
import { DynamoAttributeValue } from '@aws-cdk/aws-stepfunctions-tasks';
import { JsonPath } from '@aws-cdk/aws-stepfunctions';
import { CreditRating } from './ExternalContracts';

export interface LoanProcessorStateMachineProps extends Omit<sfn.StateMachineProps, 'definition'> {
  creditRatingFunction: lambda.IFunction;
  loanTable: dynamodb.ITable;
  declinedTopic: sns.ITopic;
  errorQueue: sqs.IQueue;
}

export default class LoanProcessorStateMachine extends StateMachineWithGraph {
  //
  static readonly CreditRatingMaxAttempts = 2;

  static readonly CreditRatingErrorSource = 'CreditRating';

  constructor(scope: cdk.Construct, id: string, props: LoanProcessorStateMachineProps) {
    super(scope, id, {
      ...props,
      getDefinition: (definitionScope: cdk.Construct): sfn.IChainable =>
        StateMachineBuilder.new()

          .lambdaInvoke('GetCreditRating', {
            lambdaFunction: props.creditRatingFunction,
            parameters: {
              'firstName.$': '$.loanDetails.firstName',
              'lastName.$': '$.loanDetails.lastName',
              'postcode.$': '$.loanDetails.postcode',
            },
            resultPath: '$.creditRating',
            retry: {
              maxAttempts: LoanProcessorStateMachine.CreditRatingMaxAttempts,
            },
            catches: [{ handler: 'HandleCreditRatingError' }],
          })

          .choice('CheckCreditRating', {
            choices: [
              {
                when: sfn.Condition.stringEquals('$.creditRating.value', CreditRating.Good),
                next: 'AcceptLoan',
              },
            ],
            otherwise: 'DeclineLoan',
          })

          .pass('AcceptLoan')
          .lambdaInvoke('BuildLoanItem', {
            lambdaFunction: new lambdaNodejs.NodejsFunction(
              definitionScope,
              'BuildLoanItemFunction'
            ),
            inputPath: '$.loanDetails',
            resultPath: '$.loanItem',
          })
          .perform(
            new sfnTasks.DynamoPutItem(definitionScope, 'PutLoanItem', {
              inputPath: '$.loanItem',
              table: props.loanTable,
              item: {
                id: DynamoAttributeValue.fromString(JsonPath.stringAt('$.id')),
                loanDetails: DynamoAttributeValue.mapFromJsonPath('$.loanDetails'),
              },
            })
          )
          .end()

          .pass('DeclineLoan')
          .lambdaInvoke('BuildDeclinedEvent', {
            lambdaFunction: new lambdaNodejs.NodejsFunction(
              definitionScope,
              'BuildDeclinedEventFunction'
            ),
            inputPath: '$.loanDetails',
            resultPath: '$.declinedEvent',
          })
          .perform(
            new sfnTasks.SnsPublish(definitionScope, 'PublishDeclinedEvent', {
              topic: props.declinedTopic,
              message: sfn.TaskInput.fromJsonPathAt('$.declinedEvent'),
            })
          )
          .end()

          .pass('HandleCreditRatingError', {
            result: sfn.Result.fromString(LoanProcessorStateMachine.CreditRatingErrorSource),
            resultPath: '$.Source',
          })

          .lambdaInvoke('ExtractErrorCause', {
            lambdaFunction: new lambdaNodejs.NodejsFunction(
              definitionScope,
              'ExtractErrorCauseFunction'
            ),
            resultPath: '$.Cause',
          })

          .perform(
            new sfnTasks.SqsSendMessage(definitionScope, 'SendErrorMessage', {
              queue: props.errorQueue,
              messageBody: sfn.TaskInput.fromObject({
                'Source.$': '$.Source',
                'Cause.$': '$.Cause',
              }),
            })
          )

          .fail('CreditRatingFailure', {
            cause: LoanProcessorStateMachine.CreditRatingErrorSource,
          })

          .build(definitionScope, {
            defaultProps: {
              lambdaInvoke: {
                payloadResponseOnly: true,
                retryOnServiceExceptions: false,
              },
            },
          }),
    });
  }
}
