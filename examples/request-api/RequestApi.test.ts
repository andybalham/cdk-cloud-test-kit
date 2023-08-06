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

  it(`publishes event as expected`, async () => {
    // Arrange

    const requestApiUrl = `${requestApiBaseUrl}/dev/requests`;

    const loanApplicationDetails: LoanApplicationDetails = {
      personalDetails: {
        firstName: 'Alex',
        lastName: 'Pritchard',
        niNumber: 'AB123456C',
        address: {
          lines: ['999 Letsby Avenue', 'Plodville'],
          postcode: 'AB1 2CD',
        },
      },
      loanDetails: {
        amount: 10000,
        termMonths: 24,
      },
    };

    // Act

    const API_KEY = process.env.REQUEST_API_KEY ?? '<undefined>';

    const response = await axios.post(requestApiUrl, loanApplicationDetails, {
      headers: {
        'x-api-key': API_KEY,
      },
    });

    expect(response.status).to.equal(201);

    const { applicationReference } = response.data;

    expect(applicationReference).to.not.be.undefined;

    // Await

    const { observations, timedOut } = await testClient.pollTestAsync({
      until: async (o) => o.length > 0,
    });

    // Assert

    expect(timedOut, 'timedOut').to.be.false;

    const { actualEventDetail, actualLoanApplicationDetails } = observations[0].data;

    expect(actualEventDetail.data.loanApplicationReference).to.equal(applicationReference);

    expect(actualLoanApplicationDetails).to.deep.equal(loanApplicationDetails);
  });

  it.skip(`sends 16 requests as expected`, async () => {
    // Arrange

    const requestApiUrl = `${requestApiBaseUrl}/dev/requests`;

    const loanApplicationDetails: LoanApplicationDetails = {
      personalDetails: {
        firstName: 'Alex',
        lastName: 'Pritchard',
        niNumber: 'AB123456C',
        address: {
          lines: ['999 Letsby Avenue', 'Plodville'],
          postcode: 'AB1 2CD',
        },
      },
      loanDetails: {
        amount: 10000,
        termMonths: 24,
      },
    };

    // Act

    const API_KEY = process.env.REQUEST_API_KEY ?? '<undefined>';

    // eslint-disable-next-line no-plusplus
    for (let index = 0; index < 16; index++) {
      // eslint-disable-next-line no-await-in-loop
      const response = await axios.post(requestApiUrl, loanApplicationDetails, {
        headers: {
          'x-api-key': API_KEY,
        },
      });

      expect(response.status).to.equal(201);
    }
  });
});
