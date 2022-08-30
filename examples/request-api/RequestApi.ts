import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface RequestApiProps {
  handlerFunction: IFunction;
}

export default class RequestApi extends Construct {
  //
  readonly api: RestApi;

  constructor(scope: Construct, id: string, props: RequestApiProps) {
    super(scope, id);

    this.api = new RestApi(this, 'RequestApi');

    const requests = this.api.root.addResource('requests');
    requests.addMethod('POST', new LambdaIntegration(props.handlerFunction));
  }
}
