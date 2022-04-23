/* eslint-disable @typescript-eslint/no-unused-expressions */
import { PutEventsRequestEntry } from 'aws-sdk/clients/eventbridge';
import { expect } from 'chai';
import { EventBridgeTestClient, IntegrationTestClient, LambdaTestClient } from '../../src';
import { CaseEventType, CaseStatus, CaseStatusUpdatedEvent } from './ExternalContracts';
import NotificationHub from './NotificationHub';
import NotificationHubTestStack from './NotificationHubTestStack';

describe('NotificationHub Tests', () => {
  //
  const testClient = new IntegrationTestClient({
    testStackId: NotificationHubTestStack.Id,
  });

  let notificationHubEventBus: EventBridgeTestClient;
  let publishCaseEventFunction: LambdaTestClient;

  before(async () => {
    await testClient.initialiseClientAsync();
    notificationHubEventBus = testClient.getEventBridgeTestClient(
      NotificationHub.NotificationHubEventBusId
    );
    publishCaseEventFunction = testClient.getLambdaTestClient(
      NotificationHubTestStack.PublishCaseEventFunctionId
    );
  });

  beforeEach(async () => {
    await testClient.initialiseTestAsync();
  });

  it('handles events published directly to event bus', async () => {
    // Arrange

    const caseEvent: CaseStatusUpdatedEvent = {
      eventType: CaseEventType.CaseStatusUpdated,
      lenderId: NotificationHubTestStack.TestLenderId,
      distributorId: 'test-distributor-id',
      caseId: 'C1234',
      oldStatus: CaseStatus.Referred,
      newStatus: CaseStatus.Accepted,
      statusChangedDate: '2021-08-15',
    };

    const eventRequest: PutEventsRequestEntry = {
      Source: `lender.${caseEvent.lenderId}`,
      DetailType: caseEvent.eventType,
      Detail: JSON.stringify(caseEvent),
    };

    // Act

    await notificationHubEventBus.putEventAsync(eventRequest);

    // Await

    const { observations, timedOut } = await testClient.pollTestAsync({
      until: async (o) => o.length > 0,
    });

    // Assert

    expect(timedOut, 'timedOut').to.be.false;

    const busEvent = observations[0].data;

    expect(busEvent.detail).to.deep.equal(caseEvent);
  });

  it('handles events published via function', async () => {
    // Arrange

    const caseEvent: CaseStatusUpdatedEvent = {
      eventType: CaseEventType.CaseStatusUpdated,
      lenderId: NotificationHubTestStack.TestLenderId,
      distributorId: 'test-distributor-id',
      caseId: 'C1234',
      oldStatus: CaseStatus.Referred,
      newStatus: CaseStatus.Accepted,
      statusChangedDate: '2021-08-15',
    };

    // Act

    await publishCaseEventFunction.invokeAsync(caseEvent);

    // Await

    const { observations, timedOut } = await testClient.pollTestAsync({
      until: async (o) => o.length > 0,
    });

    // Assert

    expect(timedOut, 'timedOut').to.be.false;

    const busEvent = observations[0].data;

    expect(busEvent.detail).to.deep.equal(caseEvent);
  });

  [
    {
      caseEvent: {
        eventType: CaseEventType.CaseStatusUpdated,
        lenderId: 'LenderA',
        distributorId: 'DistributorX',
        caseId: 'C1234',
        oldStatus: CaseStatus.Referred,
        newStatus: CaseStatus.Accepted,
        statusChangedDate: '2021-08-15',
      },
      expectedRules: ['EQUAL', 'AND', 'OR', 'BEGINS-WITH', 'EXISTS'],
    },
    {
      caseEvent: {
        eventType: CaseEventType.CaseStatusUpdated,
        lenderId: 'LenderA',
        distributorId: 'DistributorY',
        caseId: 'C1234',
        newStatus: CaseStatus.Accepted,
        statusChangedDate: '2021-08-15',
      },
      expectedRules: ['EQUAL', 'OR', 'BEGINS-WITH'],
    },
    {
      caseEvent: {
        eventType: CaseEventType.CaseStatusUpdated,
        lenderId: 'LenderB',
        distributorId: 'DistributorX',
        caseId: 'C1234',
        newStatus: CaseStatus.Accepted,
        statusChangedDate: '2021-08-15',
      },
      expectedRules: ['OR', 'ANYTHING-BUT', 'BEGINS-WITH'],
    },
    {
      caseEvent: {
        eventType: CaseEventType.CaseStatusUpdated,
        lenderId: 'MyLender',
        distributorId: 'DistributorX',
        caseId: 'C1234',
        newStatus: CaseStatus.Accepted,
        statusChangedDate: '2021-08-15',
      },
      expectedRules: ['ANYTHING-BUT'],
    },
    {
      caseEvent: {
        eventType: CaseEventType.CasePaymentRequiredEvent,
        lenderId: 'MyLender',
        distributorId: 'DistributorX',
        caseId: 'C1234',
        total: 0,
        description: 'Zero',
      },
      expectedRules: ['NUMERIC-EQUAL', 'ANYTHING-BUT'],
    },
    {
      caseEvent: {
        eventType: CaseEventType.CasePaymentRequiredEvent,
        lenderId: 'MyLender',
        distributorId: 'DistributorX',
        caseId: 'C1234',
        total: 100,
        description: 'One hundred',
      },
      expectedRules: ['NUMERIC-RANGE', 'ANYTHING-BUT'],
    },
    {
      caseEvent: {
        eventType: CaseEventType.CasePaymentRequiredEvent,
        lenderId: 'MyLender',
        distributorId: 'DistributorX',
        caseId: 'C1234',
        total: 100.1,
        description: 'One hundred plus',
      },
      expectedRules: ['ANYTHING-BUT'],
    },
  ].forEach((theory) => {
    it(`filters events as expected: ${JSON.stringify(theory)}`, async () => {
      // Arrange

      const eventRequest: PutEventsRequestEntry = {
        Source: `test.event-pattern`,
        DetailType: theory.caseEvent.eventType,
        Detail: JSON.stringify(theory.caseEvent),
      };

      // Act

      await notificationHubEventBus.putEventAsync(eventRequest);

      // Await

      const { observations, timedOut } = await testClient.pollTestAsync({
        until: async (o) => o.length >= theory.expectedRules.length,
      });

      // Assert

      expect(timedOut, 'timedOut').to.be.false;

      expect(observations.length, JSON.stringify(observations)).to.equal(
        theory.expectedRules.length
      );

      theory.expectedRules.forEach((r) => {
        const isRuleObserved = observations.some((o) => o.data === r);
        expect(isRuleObserved, r).to.be.true;
      });
    });
  });
});
