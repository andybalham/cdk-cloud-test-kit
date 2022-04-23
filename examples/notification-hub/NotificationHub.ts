import { Construct } from 'constructs';
import {
  aws_lambda as lambda,
  aws_lambda_nodejs as lambdaNodejs,
  aws_events as events,
} from 'aws-cdk-lib';

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
      }
    );

    this.eventBus.grantPutEventsTo(this.publishCaseEventFunction);
  }
}
