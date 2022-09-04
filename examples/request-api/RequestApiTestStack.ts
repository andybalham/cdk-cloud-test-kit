import { RemovalPolicy } from 'aws-cdk-lib';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { IntegrationTestStack } from '../../src';
import { EventDetailType } from './domain-events';
import RequestApi from './RequestApi';

export default class RequestApiTestStack extends IntegrationTestStack {
  //
  static readonly Id = 'RequestApiTestStack';

  static readonly RequestApiId = 'RequestApi';

  static readonly EventAsserterId = 'EventAsserter';

  constructor(scope: Construct, id: string) {
    super(scope, id, {
      testStackId: RequestApiTestStack.Id,
      integrationTestTable: true,
    });

    const bucket = new Bucket(this, 'Bucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const eventBus = new EventBus(this, 'EventBus');

    const loanApplicationSubmittedRule = this.addEventBridgePatternRule('Rule', eventBus, {
      detailType: [EventDetailType.LoanApplicationSubmitted],
    });

    this.addTestFunction(
      new NodejsFunction(this, RequestApiTestStack.EventAsserterId, {
        logRetention: RetentionDays.ONE_DAY,
      })
    );

    this.addEventBridgeRuleTargetFunction(
      loanApplicationSubmittedRule,
      RequestApiTestStack.EventAsserterId
    );

    // SUT

    const sut = new RequestApi(this, 'SUT', {
      eventBus,
      bucket,
    });

    this.addTestResourceTag(sut.api, RequestApiTestStack.RequestApiId);
  }
}
