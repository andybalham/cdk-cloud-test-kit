import { Construct } from 'constructs';
import {
  aws_lambda as lambda,
  aws_lambda_nodejs as lambdaNodejs,
  aws_events as events,
} from 'aws-cdk-lib';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';

export default class NotificationHub extends Construct {
  //
  readonly eventBus: events.EventBus;

  readonly publishCaseEventFunction: lambda.IFunction;

  static readonly NotificationHubEventBusId = 'NotificationHubEventBus';

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.eventBus = new events.EventBus(this, NotificationHub.NotificationHubEventBusId);

    this.publishCaseEventFunction = new lambdaNodejs.NodejsFunction(
      this,
      'PublishCaseEventFunction',
      {
        environment: {
          EVENT_BUS_NAME: this.eventBus.eventBusName,
        },
        logRetention: RetentionDays.ONE_DAY,
      }
    );

    this.eventBus.grantPutEventsTo(this.publishCaseEventFunction);
  }
}
