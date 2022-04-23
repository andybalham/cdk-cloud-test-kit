import * as cdk from '@aws-cdk/core';
import * as events from '@aws-cdk/aws-events';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';

export default class NotificationHub extends cdk.Construct {
  //
  readonly eventBus: events.EventBus;

  readonly publishCaseEventFunction: lambda.IFunction;

  static readonly NotificationHubEventBusId = 'NotificationHubEventBus';

  constructor(scope: cdk.Construct, id: string) {
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
