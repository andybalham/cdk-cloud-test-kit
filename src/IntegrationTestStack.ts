import { Construct, IConstruct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import {
  aws_sqs as sqs,
  aws_sns as sns,
  aws_sns_subscriptions as snsSubs,
  aws_dynamodb as dynamodb,
  aws_lambda as lambda,
  aws_lambda_event_sources as lambdaEventSources,
  aws_lambda_nodejs as lambdaNodejs,
  aws_events as events,
  aws_events_targets as eventsTargets,
} from 'aws-cdk-lib';
import path from 'path';
import fs from 'fs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';

export interface IntegrationTestStackProps extends cdk.StackProps {
  testStackId: string;
  integrationTestTable?: boolean;
  testFunctionIds?: string[];
}

export default abstract class IntegrationTestStack extends cdk.Stack {
  //
  readonly testStackId: string;

  static readonly IntegrationTestTableId = 'IntegrationTestTable';

  readonly integrationTestTable: dynamodb.Table;

  readonly testFunctions: Record<string, lambda.IFunction>;

  constructor(scope: Construct, id: string, props: IntegrationTestStackProps) {
    super(scope, id, props);

    this.testStackId = props.testStackId;

    if (props.integrationTestTable || (props.testFunctionIds?.length ?? 0) > 0) {
      //
      // Test table

      this.integrationTestTable = new dynamodb.Table(
        this,
        IntegrationTestStack.IntegrationTestTableId,
        {
          partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
          sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
          billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }
      );

      this.addTestResourceTag(
        this.integrationTestTable,
        IntegrationTestStack.IntegrationTestTableId
      );
    }

    this.testFunctions = {};

    if (props.testFunctionIds) {
      props.testFunctionIds
        .map((i) => ({ observerId: i, function: this.newTestFunction(i) }))
        .forEach((iaf) => {
          this.testFunctions[iaf.observerId] = iaf.function;
        });
    }
  }

  addTestResourceTag(resource: IConstruct, resourceId: string): void {
    cdk.Tags.of(resource).add(this.testStackId, resourceId);
  }

  addSQSQueueConsumer(queue: sqs.IQueue, testFunctionId: string): void {
    //
    const queueObserverFunction = this.testFunctions[testFunctionId];

    queue.grantConsumeMessages(queueObserverFunction);
    queueObserverFunction.addEventSource(new lambdaEventSources.SqsEventSource(queue));
  }

  addSNSTopicSubscriber(topic: sns.ITopic, testFunctionId: string): void {
    //
    const topicObserverFunction = this.testFunctions[testFunctionId];

    topic.addSubscription(new snsSubs.LambdaSubscription(topicObserverFunction));
  }

  addDynamoDBTableEventSource(
    table: dynamodb.ITable,
    testFunctionId: string,
    props?: lambdaEventSources.DynamoEventSourceProps
  ): void {
    //
    this.testFunctions[testFunctionId].addEventSource(
      new lambdaEventSources.DynamoEventSource(table, {
        ...{
          startingPosition: lambda.StartingPosition.TRIM_HORIZON,
        },
        ...props,
      })
    );
  }

  addEventBridgePatternRule(
    id: string,
    eventBus: events.EventBus,
    eventPattern: events.EventPattern
  ): events.Rule {
    //
    const rule = new events.Rule(this, id, {
      eventBus,
      eventPattern,
    });

    return rule;
  }

  addEventBridgeRuleTargetFunction(
    rule: events.Rule,
    testFunctionId: string,
    event?: events.RuleTargetInput
  ): events.Rule {
    //
    rule.addTarget(
      new eventsTargets.LambdaFunction(this.testFunctions[testFunctionId], {
        event,
      })
    );

    return rule;
  }

  // TODO 04Sep22: What is the plan to implement this?
  // async addEventBridgeRuleTargetWebhookAsync(
  //   rule: events.Rule,
  //   url: string
  // ): Promise<void> {}

  addTestFunction(testFunction: lambda.Function, functionIdOverride?: string): lambda.Function {
    //
    const functionId = functionIdOverride ?? testFunction.node.id;

    testFunction.addEnvironment('FUNCTION_ID', functionId);

    if (this.integrationTestTable === undefined) {
      throw new Error(
        'No integration test table specified. Set integrationTestTable to true in IntegrationTestStackProps.'
      );
    }

    testFunction.addEnvironment('INTEGRATION_TEST_TABLE_NAME', this.integrationTestTable.tableName);

    this.integrationTestTable.grantReadWriteData(testFunction);

    this.testFunctions[functionId] = testFunction;

    return testFunction;
  }

  private newTestFunction(functionId: string): lambda.IFunction {
    //
    const typescriptEntry = path.join(__dirname, '.', 'testFunction.ts');
    const packageEntry = path.join(__dirname, '.', 'testFunction.js');

    const entry = fs.existsSync(typescriptEntry) ? typescriptEntry : packageEntry;

    const testFunction = new lambdaNodejs.NodejsFunction(this, `TestFunction-${functionId}`, {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry,
      handler: 'handler',
      environment: {
        FUNCTION_ID: functionId,
        INTEGRATION_TEST_TABLE_NAME: this.integrationTestTable.tableName,
      },
      logRetention: RetentionDays.ONE_DAY,
      tracing: lambda.Tracing.ACTIVE,
    });

    this.addTestResourceTag(testFunction, functionId);

    this.integrationTestTable.grantReadWriteData(testFunction);

    return testFunction;
  }
}
