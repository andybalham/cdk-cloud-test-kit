# Notification Hub

## Overview

The aim of this example is to demonstrate how the `sls-testing-toolkit` can be used to test the `NotificationHubConstruct`, as shown below.

![Diagram showing the Notification Hub construct](https://raw.githubusercontent.com/andybalham/sls-testing-toolkit/main/examples/notification-hub/images/notification-hub-test-stack.jpg)

The `sls-testing-toolkit` helps here, as it allows you to deploy the construct under test as part of a test stack and test the construct in isolation. As shown above, the result is the [`NotificationHubTestStack`](https://github.com/andybalham/sls-testing-toolkit/blob/main/examples/notification-hub/NotificationHubTestStack.ts). With the construct deployed in this manner, the `sls-testing-toolkit` makes it easy to put events on the event bus from a unit test.

```TypeScript
let notificationHubEventBus: EventBridgeTestClient;

// Snip

notificationHubEventBus = testClient.getEventBridgeTestClient(
  NotificationHub.NotificationHubEventBusId
);

// Snip

const caseEvent: CaseStatusUpdatedEvent = {
  eventType: CaseEventType.CaseStatusUpdated,
  lenderId: 'MyLender',
  caseId: 'C1234',
};

const eventRequest: PutEventsRequestEntry = {
  Source: `lender.${caseEvent.lenderId}`,
  DetailType: caseEvent.eventType,
  Detail: JSON.stringify(caseEvent),
};

await notificationHubEventBus.putEventAsync(eventRequest);
```

See [`NotificationHub.test.ts`](https://github.com/andybalham/sls-testing-toolkit/blob/main/examples/notification-hub/NotificationHub.test.ts) for the full code.

`IntegrationTestStack` also provides a number of convenience methods for attaching test functions as targets for pattern-based rules, e.g.:

```TypeScript
this.addEventBridgeRuleTargetFunction(
  this.addEventBridgePatternRule(
    'EqualRule',
    sut.eventBus,
    NotificationHubTestStack.EqualTestEventPattern
  ),
  NotificationHubTestStack.BusObserverFunctionId,
  events.RuleTargetInput.fromText('EQUAL')
);
```

The `IntegrationTestClient` has an `isEventPatternMatchAsync` method for testing CDK-based event patterns. It encapsulates the differences between the format expected by CDK and that expected by the SDK. See [`NotificationHubPattern.test.ts`](https://github.com/andybalham/sls-testing-toolkit/blob/main/examples/notification-hub/NotificationHubPattern.test.ts) for examples of this.
