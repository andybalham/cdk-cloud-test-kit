/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */

import { EmailEvent, LoanDetails } from './ExternalContracts';

export const handler = async (loanDetails: LoanDetails): Promise<EmailEvent> => {
  console.log(JSON.stringify({ loanDetails }, null, 2));
  return {
    email: loanDetails.email,
    message: `Dear ${loanDetails.firstName} ${loanDetails.lastName}, I am sorry to say your loan application has been declined.`,
  };
};
