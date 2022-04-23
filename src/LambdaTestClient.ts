/* eslint-disable import/no-extraneous-dependencies */
import AWS from 'aws-sdk';
import { InvokeAsyncResponse } from 'aws-sdk/clients/lambda';

export default class LambdaTestClient {
  //
  readonly lambda: AWS.Lambda;

  constructor(public readonly region: string, public readonly functionName: string) {
    this.lambda = new AWS.Lambda({ region });
  }

  async invokeAsync<TReq, TRes>(request?: TReq): Promise<TRes | undefined> {
    //
    const lambdaPayload = request ? { Payload: JSON.stringify(request) } : {};

    const params = {
      FunctionName: this.functionName,
      ...lambdaPayload,
    };

    const { Payload } = await this.lambda.invoke(params).promise();

    if (Payload) {
      return JSON.parse(Payload.toString());
    }

    return undefined;
  }

  async asyncInvokeAsync(request?: Record<string, any>): Promise<InvokeAsyncResponse> {
    //
    const lambdaInvokeArgs = { InvokeArgs: JSON.stringify(request || {}) };

    const params = {
      FunctionName: this.functionName,
      ...lambdaInvokeArgs,
    };

    const asyncResponse = await this.lambda.invokeAsync(params).promise();

    return asyncResponse;
  }
}
