/* eslint-disable @typescript-eslint/no-unused-expressions */
import { PutEventsRequestEntry } from 'aws-sdk/clients/eventbridge';
import { expect } from 'chai';
import { IntegrationTestClient } from '../../src';
import { CaseEventType, CaseStatus } from './ExternalContracts';
import NotificationHubTestStack from './NotificationHubTestStack';

describe('NotificationHubPattern Tests', () => {
  //
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
      expectedMatch: { equal: true, and: true, or: true, beginsWith: true, exists: true },
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
      expectedMatch: { equal: true, or: true, beginsWith: true },
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
      expectedMatch: { or: true, anythingBut: true, beginsWith: true },
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
      expectedMatch: { anythingBut: true },
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
      expectedMatch: { numericEqual: true, anythingBut: true },
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
      expectedMatch: { numericRange: true, anythingBut: true },
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
      expectedMatch: { anythingBut: true },
    },
  ].forEach((theory) => {
    it(`matches events as expected: ${JSON.stringify(theory)}`, async () => {
      // Arrange

      const putEventsRequest: PutEventsRequestEntry = {
        Source: `test.event-pattern`,
        DetailType: theory.caseEvent.eventType,
        Detail: JSON.stringify(theory.caseEvent),
      };

      // Act

      const isEqualMatch = await IntegrationTestClient.isEventPatternMatchAsync({
        eventPattern: NotificationHubTestStack.EqualTestEventPattern,
        putEventsRequest,
      });

      const isAndMatch = await IntegrationTestClient.isEventPatternMatchAsync({
        eventPattern: NotificationHubTestStack.AndTestEventPattern,
        putEventsRequest,
      });

      const isOrMatch = await IntegrationTestClient.isEventPatternMatchAsync({
        eventPattern: NotificationHubTestStack.OrTestEventPattern,
        putEventsRequest,
      });

      const isAnythingButMatch = await IntegrationTestClient.isEventPatternMatchAsync({
        eventPattern: NotificationHubTestStack.AnythingButTestEventPattern,
        putEventsRequest,
      });

      const isBeginsWithMatch = await IntegrationTestClient.isEventPatternMatchAsync({
        eventPattern: NotificationHubTestStack.BeginsWithTestEventPattern,
        putEventsRequest,
      });

      const isExistsMatch = await IntegrationTestClient.isEventPatternMatchAsync({
        eventPattern: NotificationHubTestStack.ExistsTestEventPattern,
        putEventsRequest,
      });

      const isNumericEqualMatch = await IntegrationTestClient.isEventPatternMatchAsync({
        eventPattern: NotificationHubTestStack.NumericEqualTestEventPattern,
        putEventsRequest,
      });

      const isNumericRangeMatch = await IntegrationTestClient.isEventPatternMatchAsync({
        eventPattern: NotificationHubTestStack.NumericRangeTestEventPattern,
        putEventsRequest,
      });

      // Assert

      expect(isEqualMatch, 'isEqualMatchActual').to.equal(theory.expectedMatch.equal ?? false);
      expect(isAndMatch, 'isAndMatchActual').to.equal(theory.expectedMatch.and ?? false);
      expect(isAnythingButMatch, 'isAnythingButMatch').to.equal(
        theory.expectedMatch.anythingBut ?? false
      );
      expect(isBeginsWithMatch, 'isBeginsWithMatch').to.equal(
        theory.expectedMatch.beginsWith ?? false
      );
      expect(isExistsMatch, 'isExistsMatch').to.equal(theory.expectedMatch.exists ?? false);
      expect(isNumericEqualMatch, 'isNumericEqualMatch').to.equal(
        theory.expectedMatch.numericEqual ?? false
      );
      expect(isNumericRangeMatch, 'isNumericRangeMatch').to.equal(
        theory.expectedMatch.numericRange ?? false
      );
      expect(isOrMatch, 'isOrMatch').to.equal(theory.expectedMatch.or ?? false);
    });
  });
});
