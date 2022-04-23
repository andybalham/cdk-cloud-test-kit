/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */

import { nanoid } from 'nanoid';
import { LoanDetails, LoanItem } from './ExternalContracts';

export const handler = async (loanDetails: LoanDetails): Promise<LoanItem> => {
  console.log(JSON.stringify({ loanDetails }, null, 2));
  return {
    id: nanoid(),
    loanDetails,
  };
};
