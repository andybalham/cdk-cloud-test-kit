/* eslint-disable @typescript-eslint/no-unused-expressions */
import { SQSEvent } from 'aws-lambda';
import { expect } from 'chai';
import { TestObservation, IntegrationTestClient, SQSTestClient } from '../../src';
import { Message } from './Message';
import TestStack from './SimpleMessageRouterTestStack';

describe('SimpleMessageRouter Test Suite', () => {
  //
  let testInputQueue: SQSTestClient;

  const testClient = new IntegrationTestClient({
    testStackId: TestStack.Id,
  });

  before(async () => {
    await testClient.initialiseClientAsync();
    testInputQueue = testClient.getSQSTestClient(TestStack.TestInputQueueId);
  });

  beforeEach(async () => {
    await testClient.initialiseTestAsync();
  });

  [
    { values: [], isExpectedPositive: true },
    { values: [1, 2, 3], isExpectedPositive: true },
    { values: [1, 2, -3], isExpectedPositive: true },
    { values: [1, -2, -3], isExpectedPositive: false },
  ].forEach((theory) => {
    it(`Routes as expected: ${JSON.stringify(theory)}`, async () => {
      // Arrange

      const testMessage: Message = {
        values: theory.values,
      };

      // Act

      await testInputQueue.sendMessageAsync(testMessage);

      // Await

      const { observations, timedOut } = await testClient.pollTestAsync({
        until: async (o) => o.length > 0,
        intervalSeconds: 2,
        timeoutSeconds: 12,
      });

      // Assert

      expect(timedOut, 'timedOut').to.be.false;

      expect(observations.length).to.equal(1);

      const positiveObservations = TestObservation.filterById(
        observations,
        TestStack.PositiveOutputQueueConsumerId
      );

      const negativeObservations = TestObservation.filterById(
        observations,
        TestStack.NegativeOutputQueueConsumerId
      );

      if (theory.isExpectedPositive) {
        //
        expect(positiveObservations.length).to.be.greaterThan(0);
        expect(negativeObservations.length).to.equal(0);

        const routedMessage = JSON.parse(
          (positiveObservations[0].data as SQSEvent).Records[0].body
        );
        expect(routedMessage).to.deep.equal(testMessage);
        //
      } else {
        //
        expect(positiveObservations.length).to.equal(0);
        expect(negativeObservations.length).to.be.greaterThan(0);

        const routedMessage = JSON.parse(
          (negativeObservations[0].data as SQSEvent).Records[0].body
        );
        expect(routedMessage).to.deep.equal(testMessage);
      }
    });
  });

  it('routes to DLQ', async () => {
    // Arrange

    await testClient.initialiseTestAsync({
      testId: 'routes-to-dlq',
      mockResponses: {
        [TestStack.PositiveOutputQueueConsumerId]: [{ error: 'Positive error', repeat: 3 }],
      },
    });

    const testMessage: Message = {
      values: [],
    };

    // Act

    await testInputQueue.sendMessageAsync(testMessage);

    // Await

    const { observations, timedOut } = await testClient.pollTestAsync({
      until: async (o) =>
        TestObservation.getCountById(o, TestStack.PositiveOutputDLQConsumerId) > 0,
      intervalSeconds: 2,
      timeoutSeconds: 12,
    });

    // Assert

    expect(timedOut, 'timedOut').to.be.false;

    const positiveDLQObservations = TestObservation.filterById(
      observations,
      TestStack.PositiveOutputDLQConsumerId
    );

    expect(positiveDLQObservations.length).to.be.greaterThanOrEqual(1);
  });

  it('retries', async () => {
    // Arrange

    const errorCount = 2;

    await testClient.initialiseTestAsync({
      testId: 'routes-to-dlq',
      mockResponses: {
        [TestStack.PositiveOutputQueueConsumerId]: [
          { error: 'Positive error', repeat: errorCount },
        ],
      },
    });

    const testMessage: Message = {
      values: [],
    };

    // Act

    await testInputQueue.sendMessageAsync(testMessage);

    // Await

    const { observations, timedOut } = await testClient.pollTestAsync({
      until: async (o) => o.length > errorCount,
      intervalSeconds: 2,
      timeoutSeconds: 12,
    });

    // Assert

    expect(timedOut, 'timedOut').to.be.false;

    expect(observations.length).to.be.greaterThanOrEqual(errorCount + 1);
  });
});
