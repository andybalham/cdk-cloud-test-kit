/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */

export const handler = async (input: any): Promise<any> => {
  const cause = JSON.parse(input.Cause);
  return cause;
};
