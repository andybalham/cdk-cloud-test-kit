/* eslint-disable @typescript-eslint/no-unused-expressions */
import { IntegrationTestClient } from '../src';

describe('Temp Test Suite', () => {
  //
  const testClient = new IntegrationTestClient({
    testStackId: 'TaskTokenTestStack',
  });

  before(async () => {
    await testClient.initialiseClientAsync();
  });

  beforeEach(async () => {
    await testClient.initialiseTestAsync();
  });

  it(`Does something`, async () => {
    // Arrange
    // Act
    // Await
    // Assert
  });
});
