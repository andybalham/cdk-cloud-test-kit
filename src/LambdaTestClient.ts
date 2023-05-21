/* eslint-disable import/no-extraneous-dependencies */
import { InvocationType, InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';

export default class LambdaTestClient {
  //
  readonly lambdaClient: LambdaClient;

  constructor(public readonly region: string, public readonly functionName: string) {
    this.lambdaClient = new LambdaClient({ region });
  }

  async invokeAsync<TReq, TRes>(request?: TReq): Promise<TRes | undefined> {
    //
    const encoder = new TextEncoder();
    const lambdaPayload = request ? { Payload: encoder.encode(JSON.stringify(request)) } : {};

    const params = {
      FunctionName: this.functionName,
      ...lambdaPayload,
    };

    const { Payload } = await this.lambdaClient.send(new InvokeCommand(params));

    if (Payload) {
      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(Payload));
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

    await this.lambdaClient.send(new InvokeCommand(params));
  }
}
