/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-console */
import axios from 'axios';
import { expect } from 'chai';
import { IntegrationTestClient } from '../../src';
import { LoanApplicationDetails } from './domain-models';
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

    const loanApplicationDetails: LoanApplicationDetails = {
      personalDetails: {
        firstName: 'Alex',
        lastName: 'Pritchard',
        ssn: '001-003-1234',
        address: {
          lines: ['999 Letsby Avenue', 'Plodville'],
          zipCode: 'CA: 90210',
        },
      },
      loanDetails: {
        amount: 10000,
        termMonths: 24,
      },
    };

    // Act

    const response = await axios.post(requestApiUrl, loanApplicationDetails);

    expect(response.status).to.equal(201);

    // TODO 04Sep22: Assert the body reference

    console.log(JSON.stringify({ status: response.status, data: response.data }, null, 2));

    // Await

    const { observations, timedOut } = await testClient.pollTestAsync({
      until: async (o) => o.length > 0,
    });

    // Assert

    expect(timedOut, 'timedOut').to.be.false;

    console.log(JSON.stringify({ observations }, null, 2));

    // TODO 04Sep22: Assert observation
  });
});
