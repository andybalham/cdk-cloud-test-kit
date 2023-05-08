import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { BUCKET_NAME, EVENT_BUS_NAME } from './RequestApi.EventPublisher';

export interface RequestApiProps {
  eventBus: EventBus;
  bucket: Bucket;
}

export default class RequestApi extends Construct {
  //
  readonly api: RestApi;

  constructor(scope: Construct, id: string, props: RequestApiProps) {
    super(scope, id);

    const eventPublisherFunction = new NodejsFunction(this, 'EventPublisher', {
      // TODO 07May23: Upgrade
      runtime: Runtime.NODEJS_14_X,
      environment: {
        [BUCKET_NAME]: props.bucket.bucketName,
        [EVENT_BUS_NAME]: props.eventBus.eventBusName,
      },
    });

    props.bucket.grantReadWrite(eventPublisherFunction);
    props.eventBus.grantPutEventsTo(eventPublisherFunction);

    this.api = new RestApi(this, 'RequestApi');

    const requests = this.api.root.addResource('requests');
    requests.addMethod('POST', new LambdaIntegration(eventPublisherFunction));
  }
}
