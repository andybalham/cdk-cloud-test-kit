/* eslint-disable import/no-extraneous-dependencies */
import { InvocationType, InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';

export default class LambdaTestClient {
  //
  readonly lambda: LambdaClient;

  constructor(public readonly region: string, public readonly functionName: string) {
    this.lambda = new LambdaClient({ region });
  }

  async invokeAsync<TReq, TRes>(request?: TReq): Promise<TRes | undefined> {
    //
    const encoder = new TextEncoder();
    const lambdaPayload = request ? { Payload: encoder.encode(JSON.stringify(request)) } : {};

    const params = {
      FunctionName: this.functionName,
      ...lambdaPayload,
    };

    const { Payload } = await this.lambda.send(new InvokeCommand(params));

    if (Payload) {
      return JSON.parse(Payload.toString());
    }

    return undefined;
  }

  async asyncInvokeAsync<TReq>(request?: TReq): Promise<void> {
    //
    const encoder = new TextEncoder();
    const lambdaPayload = request ? { Payload: encoder.encode(JSON.stringify(request)) } : {};

    const params = {
      FunctionName: this.functionName,
      InvocationType: InvocationType.Event,
      ...lambdaPayload,
    };

    await this.lambda.send(new InvokeCommand(params));
  }
}
