import * as cdk from '@aws-cdk/core';
import * as events from '@aws-cdk/aws-events';
import * as eventsTargets from '@aws-cdk/aws-events-targets';
import { IntegrationTestStack } from '../../src';
import NotificationHub from './NotificationHub';
import { CaseEventType } from './ExternalContracts';

export default class NotificationHubTestStack extends IntegrationTestStack {
  //
  static readonly Id = `NotificationHubTestStack`;

  static readonly BusObserverFunctionId = 'BusObserverFunction';

  static readonly PublishCaseEventFunctionId = 'PublishCaseEventFunction';

  static readonly TestLenderId = 'test-lender-id';

  static readonly TestEventPattern = {
    source: ['test.event-pattern'],
  };

  static readonly EqualTestEventPattern = {
    ...NotificationHubTestStack.TestEventPattern,
    detail: {
      lenderId: ['LenderA'],
    },
  };

  static readonly AndTestEventPattern = {
    ...NotificationHubTestStack.TestEventPattern,
    detail: {
      lenderId: ['LenderA'],
      distributorId: ['DistributorX'],
    },
  };

  static readonly OrTestEventPattern = {
    ...NotificationHubTestStack.TestEventPattern,
    detail: {
      lenderId: ['LenderA', 'LenderB'],
    },
  };

  static readonly AnythingButTestEventPattern = {
    ...NotificationHubTestStack.TestEventPattern,
    detail: {
      lenderId: [{ 'anything-but': ['LenderA'] }],
    },
  };

  static readonly BeginsWithTestEventPattern = {
    ...NotificationHubTestStack.TestEventPattern,
    detail: {
      // Event pattern is not valid. Reason: prefix match pattern must be a string
      // lenderId: [{ prefix: ['lender'] }],
      lenderId: [{ prefix: 'Lender' }],
    },
  };

  static readonly ExistsTestEventPattern = {
    ...NotificationHubTestStack.TestEventPattern,
    detailType: [CaseEventType.CaseStatusUpdated],
    detail: {
      oldStatus: [{ exists: true }],
    },
  };

  static readonly NumericEqualTestEventPattern = {
    ...NotificationHubTestStack.TestEventPattern,
    detailType: [CaseEventType.CasePaymentRequiredEvent],
    detail: {
      total: [{ numeric: ['=', 0] }],
    },
  };

  static readonly NumericRangeTestEventPattern = {
    ...NotificationHubTestStack.TestEventPattern,
    detailType: [CaseEventType.CasePaymentRequiredEvent],
    detail: {
      // total: [{ numeric: ['>', 0, '≤', 100] }], // TODO 24Aug21: Is ≤ correct?
      total: [{ numeric: ['>', 0, '<=', 100] }],
    },
  };

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id, {
      testStackId: NotificationHubTestStack.Id,
      testFunctionIds: [NotificationHubTestStack.BusObserverFunctionId],
    });

    // SUT

    const sut = new NotificationHub(this, 'SUT');

    // 14Aug21: This currently has no effect, as you can't add tags to event buses at the time of writing
    // https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_TagResource.html
    this.addTestResourceTag(sut.eventBus, NotificationHub.NotificationHubEventBusId);

    this.addTestResourceTag(
      sut.publishCaseEventFunction,
      NotificationHubTestStack.PublishCaseEventFunctionId
    );

    // Bus observer rules

    const sourceRule = new events.Rule(this, 'SourceRule', {
      eventBus: sut.eventBus,
      eventPattern: {
        source: [`lender.${NotificationHubTestStack.TestLenderId}`],
      },
    });

    sourceRule.addTarget(
      new eventsTargets.LambdaFunction(
        this.testFunctions[NotificationHubTestStack.BusObserverFunctionId]
      )
    );

    // https://docs.webhook.site/
    this.addEventBridgeRuleTargetWebhookAsync(
      sourceRule,
      'https://webhook.site/f2753757-733f-4d0f-935e-5e71187a15c4'
    );

    // https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html
    // https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns-content-based-filtering.html

    this.addEventBridgeRuleTargetFunction(
      this.addEventBridgePatternRule(
        'EqualRule',
        sut.eventBus,
        NotificationHubTestStack.EqualTestEventPattern
      ),
      NotificationHubTestStack.BusObserverFunctionId,
      events.RuleTargetInput.fromText('EQUAL')
    );

    this.addEventBridgeRuleTargetFunction(
      this.addEventBridgePatternRule(
        'AndRule',
        sut.eventBus,
        NotificationHubTestStack.AndTestEventPattern
      ),
      NotificationHubTestStack.BusObserverFunctionId,
      events.RuleTargetInput.fromText('AND')
    );

    this.addEventBridgeRuleTargetFunction(
      this.addEventBridgePatternRule(
        'OrRule',
        sut.eventBus,
        NotificationHubTestStack.OrTestEventPattern
      ),
      NotificationHubTestStack.BusObserverFunctionId,
      events.RuleTargetInput.fromText('OR')
    );

    this.addEventBridgeRuleTargetFunction(
      this.addEventBridgePatternRule(
        'AnythingButRule',
        sut.eventBus,
        NotificationHubTestStack.AnythingButTestEventPattern
      ),
      NotificationHubTestStack.BusObserverFunctionId,
      events.RuleTargetInput.fromText('ANYTHING-BUT')
    );

    this.addEventBridgeRuleTargetFunction(
      this.addEventBridgePatternRule(
        'BeginsWithRule',
        sut.eventBus,
        NotificationHubTestStack.BeginsWithTestEventPattern
      ),
      NotificationHubTestStack.BusObserverFunctionId,
      events.RuleTargetInput.fromText('BEGINS-WITH')
    );

    this.addEventBridgeRuleTargetFunction(
      this.addEventBridgePatternRule(
        'ExistsRule',
        sut.eventBus,
        NotificationHubTestStack.ExistsTestEventPattern
      ),
      NotificationHubTestStack.BusObserverFunctionId,
      events.RuleTargetInput.fromText('EXISTS')
    );

    this.addEventBridgeRuleTargetFunction(
      this.addEventBridgePatternRule(
        'NumericEqualRule',
        sut.eventBus,
        NotificationHubTestStack.NumericEqualTestEventPattern
      ),
      NotificationHubTestStack.BusObserverFunctionId,
      events.RuleTargetInput.fromText('NUMERIC-EQUAL')
    );

    this.addEventBridgeRuleTargetFunction(
      this.addEventBridgePatternRule(
        'NumericRangeRule',
        sut.eventBus,
        NotificationHubTestStack.NumericRangeTestEventPattern
      ),
      NotificationHubTestStack.BusObserverFunctionId,
      events.RuleTargetInput.fromText('NUMERIC-RANGE')
    );
  }
}
