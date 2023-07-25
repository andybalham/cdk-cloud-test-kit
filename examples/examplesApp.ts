/* eslint-disable no-new */
import * as cdk from 'aws-cdk-lib';
import LoanProcessorTestStack from './loan-processor-state-machine/LoanProcessorTestStack';
import NotificationHubTestStack from './notification-hub/NotificationHubTestStack';
import RequestApiTestStack from './request-api/RequestApiTestStack';
import SimpleEventRouterTestStack from './simple-event-router/SimpleEventRouterTestStack';
import SimpleMessageRouterTestStack from './simple-message-router/SimpleMessageRouterTestStack';
import TempTestStack from './TempStack';

const app = new cdk.App();
cdk.Tags.of(app).add('app', 'Cloud Test Kit Examples App');

new TempTestStack(app, TempTestStack.Id);
new SimpleEventRouterTestStack(app, SimpleEventRouterTestStack.Id);
new SimpleMessageRouterTestStack(app, SimpleMessageRouterTestStack.Id);
new LoanProcessorTestStack(app, LoanProcessorTestStack.Id);
new RequestApiTestStack(app, RequestApiTestStack.Id);
new NotificationHubTestStack(app, NotificationHubTestStack.Id);
