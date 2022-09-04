import { RemovalPolicy } from 'aws-cdk-lib';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { IntegrationTestStack } from '../../src';
import { EventDetailType } from './domain-events';
import RequestApi from './RequestApi';

export default class RequestApiTestStack extends IntegrationTestStack {
  //
  static readonly Id = `RequestApiTestStack`;

  static readonly RequestApiId = `RequestApiId`;

  static readonly EventAsserterFunctionId = `EventAsserterFunctionId`;

  constructor(scope: Construct, id: string) {
    super(scope, id, {
      testStackId: RequestApiTestStack.Id,
      testFunctionIds: [RequestApiTestStack.EventAsserterFunctionId],
    });

    const bucket = new Bucket(this, 'Bucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const eventBus = new EventBus(this, 'EventBus');

    this.addEventBridgeRuleTargetFunction(
      this.addEventBridgePatternRule('Rule', eventBus, {
        detailType: [EventDetailType.LoanApplicationSubmitted],
      }),
      RequestApiTestStack.EventAsserterFunctionId
    );

    // SUT

    const sut = new RequestApi(this, 'SUT', {
      eventBus,
      bucket,
    });

    this.addTestResourceTag(sut.api, RequestApiTestStack.RequestApiId);
  }
}
