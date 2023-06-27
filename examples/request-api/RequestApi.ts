import { Deployment, LambdaIntegration, RestApi, Stage } from 'aws-cdk-lib/aws-apigateway';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
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
      runtime: Runtime.NODEJS_18_X,
      environment: {
        [BUCKET_NAME]: props.bucket.bucketName,
        [EVENT_BUS_NAME]: props.eventBus.eventBusName,
      },
      tracing: Tracing.ACTIVE,
    });

    props.bucket.grantReadWrite(eventPublisherFunction);
    props.eventBus.grantPutEventsTo(eventPublisherFunction);

    this.api = new RestApi(this, 'RequestApi', {});

    const requests = this.api.root.addResource('requests');
    requests.addMethod('POST', new LambdaIntegration(eventPublisherFunction));

    const deployment = new Deployment(this, 'Deployment', { api: this.api });

    // const devLogGroup = new logs.LogGroup(this, 'DevLogs');

    // eslint-disable-next-line no-new
    new Stage(this, 'Dev', {
      deployment,
      tracingEnabled: true,
      // accessLogDestination: new LogGroupLogDestination(devLogGroup),
      // accessLogFormat: AccessLogFormat.jsonWithStandardFields({
      //   caller: false,
      //   httpMethod: true,
      //   ip: true,
      //   protocol: true,
      //   requestTime: true,
      //   resourcePath: true,
      //   responseLength: true,
      //   status: true,
      //   user: true,
      // }),
    });
  }
}
