/* eslint-disable import/no-extraneous-dependencies */
import StateMachineBuilder from '@andybalham/state-machine-builder-v2';
import StateMachineWithGraph from '@andybalham/state-machine-with-graph-v2';
import { Construct } from 'constructs';
import {
  aws_stepfunctions as sfn,
  aws_stepfunctions_tasks as sfnTasks,
  aws_sqs as sqs,
  aws_sns as sns,
  aws_dynamodb as dynamodb,
  aws_lambda as lambda,
  aws_lambda_nodejs as lambdaNodejs,
} from 'aws-cdk-lib';
import { DynamoAttributeValue } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { JsonPath } from 'aws-cdk-lib/aws-stepfunctions';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
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

  constructor(scope: Construct, id: string, props: LoanProcessorStateMachineProps) {
    super(scope, id, {
      ...props,
      getDefinition: (definitionScope: Construct): sfn.IChainable =>
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
              'BuildLoanItemFunction',
              {
                logRetention: RetentionDays.ONE_DAY,
              }
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
              'BuildDeclinedEventFunction',
              {
                logRetention: RetentionDays.ONE_DAY,
              }
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
              'ExtractErrorCauseFunction',
              {
                logRetention: RetentionDays.ONE_DAY,
              }
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
