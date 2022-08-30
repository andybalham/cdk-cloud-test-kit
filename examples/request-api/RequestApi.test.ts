/* eslint-disable no-console */
import axios from 'axios';
import { IntegrationTestClient } from '../../src';
import RequestApiTestStack from './RequestApiTestStack';

describe('RequestApi Tests', () => {
  //
  const testClient = new IntegrationTestClient({
    testStackId: RequestApiTestStack.Id,
  });

  let requestApiBaseUrl: string | undefined;

  before(async () => {
    await testClient.initialiseClientAsync();

    requestApiBaseUrl = testClient.getApiGatewayBaseUrlByStackId(RequestApiTestStack.RequestApiId);
  });

  beforeEach(async () => {
    await testClient.initialiseTestAsync();
  });

  it(`Does something`, async () => {
    // Arrange

    const requestApiUrl = `${requestApiBaseUrl}/prod/requests`;

    console.log(JSON.stringify({ requestApiUrl }, null, 2));

    // Act

    const response = await axios.post(requestApiUrl, {});

    console.log(JSON.stringify({ response }, null, 2));
    // Await
    // Assert
  });
});
