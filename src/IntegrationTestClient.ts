// eslint-disable-next-line import/no-extraneous-dependencies
import {
  PaginationToken as ResourcePaginationToken,
  ResourceTagMapping,
  ResourceTagMappingList,
} from 'aws-sdk/clients/resourcegroupstaggingapi';
// eslint-disable-next-line import/no-extraneous-dependencies
import dynamodb from 'aws-sdk/clients/dynamodb';
// eslint-disable-next-line import/no-extraneous-dependencies
import AWS from 'aws-sdk';
import dotenv from 'dotenv';
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  EventBus,
  ListEventBusesResponse,
  PutEventsRequestEntry,
  TestEventPatternRequest,
} from 'aws-sdk/clients/eventbridge';
import * as cdkEvents from '@aws-cdk/aws-events';
import IntegrationTestStack from './IntegrationTestStack';
import { CurrentTestItem, TestItemKey, TestItemPrefix } from './TestItems';
import StepFunctionsTestClient from './StepFunctionsTestClient';
import TestObservation from './TestObservation';
import { TestProps } from './TestProps';
import S3TestClient from './S3TestClient';
import LambdaTestClient from './LambdaTestClient';
import SNSTestClient from './SNSTestClient';
import DynamoDBTestClient from './DynamoDBTestClient';
import SQSTestClient from './SQSTestClient';
import { deleteAllLogs } from './cloudwatch';
import EventBridgeTestClient from './EventBridgeTestClient';

dotenv.config();

export interface IntegrationTestClientProps {
  testStackId: string;
  deleteLogs?: boolean;
}

export default class IntegrationTestClient {
  //
  static readonly tagging = new AWS.ResourceGroupsTaggingAPI({
    region: IntegrationTestClient.getRegion(),
  });

  static readonly db = new AWS.DynamoDB.DocumentClient({
    region: IntegrationTestClient.getRegion(),
  });

  static readonly eventBridge = new AWS.EventBridge({ region: IntegrationTestClient.getRegion() });

  testResourceTagMappingList: ResourceTagMappingList;

  testStackEventBuses = new Array<EventBus>();

  integrationTestTableName?: string;

  testId: string;

  constructor(private props: IntegrationTestClientProps) {}

  // Static ------------------------------------------------------------------

  private static region?: string;

  static getRegion(): string {
    //
    if (this.region) return this.region;

    const argRegionValue = IntegrationTestClient.getArgSwitchValue('region');

    if (argRegionValue !== undefined) {
      this.region = argRegionValue;
    } else {
      this.region = process.env.AWS_REGION;
    }

    if (!this.region)
      throw new Error(
        'Region not specified as argument (--region) or environment file (AWS_REGION)'
      );

    return this.region;
  }

  static async sleepAsync(seconds: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  }

  static async getResourcesByTagKeyAsync(key: string): Promise<ResourceTagMappingList> {
    //
    let resourceTagMappings: ResourceTagMapping[] = [];

    let paginationToken: ResourcePaginationToken | undefined;

    do {
      // eslint-disable-next-line no-await-in-loop
      const resourcesOutput = await IntegrationTestClient.tagging
        .getResources({
          TagFilters: [
            {
              Key: key,
            },
          ],
          PaginationToken: paginationToken,
        })
        .promise();

      resourceTagMappings = resourceTagMappings.concat(
        resourcesOutput.ResourceTagMappingList ?? []
      );

      paginationToken = resourcesOutput.PaginationToken;
      //
    } while (paginationToken);

    return resourceTagMappings;
  }

  // Instance ----------------------------------------------------------------

  async initialiseClientAsync(): Promise<void> {
    //
    this.testResourceTagMappingList = await IntegrationTestClient.getResourcesByTagKeyAsync(
      this.props.testStackId
    );

    this.testStackEventBuses = await this.getTestStackEventBusesAsync();

    this.integrationTestTableName = this.getTableNameByStackId(
      IntegrationTestStack.IntegrationTestTableId
    );

    const testFunctionNames = this.testResourceTagMappingList
      .filter((m) => m.ResourceARN?.match(IntegrationTestClient.ResourceNamePatterns.function))
      .map(
        (m) =>
          m.ResourceARN?.match(IntegrationTestClient.ResourceNamePatterns.function)?.groups?.name
      );

    if (this.props.deleteLogs) {
      // eslint-disable-next-line no-restricted-syntax
      for await (const testFunctionName of testFunctionNames) {
        if (testFunctionName) {
          try {
            await deleteAllLogs(IntegrationTestClient.getRegion(), testFunctionName);
          } catch (error) {
            // Ignore
          }
        }
      }
    }
  }

  private async getTestStackEventBusesAsync(): Promise<EventBus[]> {
    //
    let eventBuses = new Array<EventBus>();

    let listEventBusesResponse: ListEventBusesResponse | undefined;

    do {
      // eslint-disable-next-line no-await-in-loop
      listEventBusesResponse = await IntegrationTestClient.eventBridge
        .listEventBuses({
          NamePrefix: this.props.testStackId,
          NextToken: listEventBusesResponse?.NextToken,
        })
        .promise();

      if (listEventBusesResponse?.EventBuses) {
        eventBuses = eventBuses.concat(listEventBusesResponse.EventBuses);
      }
    } while (listEventBusesResponse?.NextToken);

    return eventBuses;
  }

  async initialiseTestAsync(props: TestProps = { testId: 'default-test-id' }): Promise<void> {
    //
    this.testId = props.testId;

    if (this.integrationTestTableName !== undefined) {
      //
      // Clear down all data related to the test

      let testItemKeys = new Array<TestItemKey>();

      let lastEvaluatedKey: dynamodb.Key | undefined;

      do {
        const testQueryParams /*: QueryInput */ = {
          // QueryInput results in a 'Condition parameter type does not match schema type'
          TableName: this.integrationTestTableName,
          KeyConditionExpression: `PK = :PK`,
          ExpressionAttributeValues: {
            ':PK': this.testId,
          },
          ExclusiveStartKey: lastEvaluatedKey,
        };

        // eslint-disable-next-line no-await-in-loop
        const testQueryOutput = await IntegrationTestClient.db.query(testQueryParams).promise();

        if (testQueryOutput.Items) {
          testItemKeys = testItemKeys.concat(testQueryOutput.Items.map((i) => i as TestItemKey));
        }

        lastEvaluatedKey = testQueryOutput.LastEvaluatedKey;
        //
      } while (lastEvaluatedKey);

      if (testItemKeys.length > 0) {
        const deleteRequests = testItemKeys.map((k) => ({
          DeleteRequest: { Key: { PK: k.PK, SK: k.SK } },
        }));

        await IntegrationTestClient.db
          .batchWrite({ RequestItems: { [this.integrationTestTableName]: deleteRequests } })
          .promise();
      }

      // Set the current test and inputs

      const currentTestItem: CurrentTestItem = {
        ...{
          PK: 'Current',
          SK: 'Test',
        },
        props,
      };

      await IntegrationTestClient.db
        .put({
          TableName: this.integrationTestTableName,
          Item: currentTestItem,
        })
        .promise();
    }
  }

  async pollTestAsync({
    until,
    intervalSeconds = 2,
    timeoutSeconds = 12,
  }: {
    until: (o: TestObservation[]) => Promise<boolean>;
    intervalSeconds?: number;
    timeoutSeconds?: number;
  }): Promise<{
    observations: TestObservation[];
    timedOut: boolean;
  }> {
    //
    const timeOutThreshold = Date.now() + 1000 * timeoutSeconds;

    const timedOut = (): boolean => Date.now() > timeOutThreshold;

    let observations = new Array<TestObservation>();

    // eslint-disable-next-line no-await-in-loop
    while (!timedOut() && !(await until(observations))) {
      //
      // eslint-disable-next-line no-await-in-loop
      await IntegrationTestClient.sleepAsync(intervalSeconds);

      // eslint-disable-next-line no-await-in-loop
      observations = await this.getTestObservationsAsync();
    }

    return {
      timedOut: !(await until(observations)),
      observations,
    };
  }

  async getTestObservationsAsync(): Promise<TestObservation[]> {
    //
    let allObservations = new Array<TestObservation>();

    if (this.integrationTestTableName === undefined) {
      return allObservations;
    }

    let lastEvaluatedKey: dynamodb.Key | undefined;

    do {
      const queryObservationsParams /*: QueryInput */ = {
        // QueryInput results in a 'Condition parameter type does not match schema type'
        TableName: this.integrationTestTableName,
        KeyConditionExpression: `PK = :PK and begins_with(SK, :SKPrefix)`,
        ExpressionAttributeValues: {
          ':PK': this.testId,
          ':SKPrefix': TestItemPrefix.TestObservation,
        },
        ExclusiveStartKey: lastEvaluatedKey,
      };

      // eslint-disable-next-line no-await-in-loop
      const queryObservationsOutput = await IntegrationTestClient.db
        .query(queryObservationsParams)
        .promise();

      if (!queryObservationsOutput.Items) {
        return allObservations;
      }

      const observations = queryObservationsOutput.Items.map(
        (i) => i.observation as TestObservation
      );

      allObservations = allObservations.concat(observations);

      lastEvaluatedKey = queryObservationsOutput.LastEvaluatedKey;
      //
    } while (lastEvaluatedKey);

    return allObservations;
  }

  getLambdaTestClient(functionStackId: string): LambdaTestClient {
    //
    const functionName = this.getFunctionNameByStackId(functionStackId);

    if (functionName === undefined) {
      throw new Error(`The function name could not be resolved for id: ${functionStackId}`);
    }

    return new LambdaTestClient(IntegrationTestClient.getRegion(), functionName);
  }

  getS3TestClient(bucketStackId: string): S3TestClient {
    //
    const bucketName = this.getBucketNameByStackId(bucketStackId);

    if (bucketName === undefined) {
      throw new Error(`The bucket name could not be resolved for id: ${bucketStackId}`);
    }

    return new S3TestClient(IntegrationTestClient.getRegion(), bucketName);
  }

  getDynamoDBTestClient(tableStackId: string): DynamoDBTestClient {
    //
    const tableName = this.getTableNameByStackId(tableStackId);

    if (tableName === undefined) {
      throw new Error(`The table name could not be resolved for id: ${tableStackId}`);
    }

    return new DynamoDBTestClient(IntegrationTestClient.getRegion(), tableName);
  }

  getStepFunctionsTestClient(stateMachineStackId: string): StepFunctionsTestClient {
    //
    const stateMachineArn = this.getResourceArnByStackId(stateMachineStackId);

    if (stateMachineArn === undefined) {
      throw new Error(`The state machine ARN could not be resolved for id: ${stateMachineStackId}`);
    }

    return new StepFunctionsTestClient(IntegrationTestClient.getRegion(), stateMachineArn);
  }

  getEventBridgeTestClient(eventBusStackId: string): EventBridgeTestClient {
    //
    // 14Aug21: At the time of writing, we cannot tag event buses, so we have to use assumptions about the name
    // const eventBusArn = this.getResourceArnByStackId(eventBusStackId);

    // if (eventBusArn === undefined) {
    //   throw new Error(`The event bus ARN could not be resolved for id: ${eventBusStackId}`);
    // }

    // return new EventBridgeTestClient(IntegrationTestClient.getRegion(), eventBusArn);

    const eventBuses = this.testStackEventBuses.filter(
      (b) => b.Name && b.Name.match(`^${this.props.testStackId}.*${eventBusStackId}`)
    );

    if (eventBuses.length !== 1) {
      throw new Error(
        `Found unexpected number of event buses (${eventBuses.length}) for id: ${eventBusStackId}`
      );
    }

    if (eventBuses[0].Arn === undefined) {
      throw new Error(`ARN undefined for event bus with id: ${eventBusStackId}`);
    }

    return new EventBridgeTestClient(IntegrationTestClient.getRegion(), eventBuses[0].Arn);
  }

  static async isEventPatternMatchAsync({
    eventPattern,
    putEventsRequest,
  }: {
    eventPattern: cdkEvents.EventPattern;
    putEventsRequest: PutEventsRequestEntry;
  }): Promise<boolean> {
    //
    const mappedEvent: any = {
      id: '6a7e8feb-b491-4cf7-a9f1-bf3703467718',
      'detail-type': putEventsRequest.DetailType ? putEventsRequest.DetailType : 'detail-type',
      source: putEventsRequest.Source ? putEventsRequest.Source : 'source',
      account: '0000000000',
      time: putEventsRequest.Time ? putEventsRequest.Time : '2017-12-22T18:43:48Z',
      region: 'us-west-1',
      resources: putEventsRequest.Resources ? putEventsRequest.Resources : [],
      detail: putEventsRequest.Detail ? JSON.parse(putEventsRequest.Detail) : undefined,
    };

    const mappedEventPattern = {
      ...eventPattern,
      'detail-type': eventPattern.detailType,
      detailType: undefined,
    };

    const request: TestEventPatternRequest = {
      Event: JSON.stringify(mappedEvent),
      EventPattern: JSON.stringify(mappedEventPattern),
    };

    const response = await this.eventBridge.testEventPattern(request).promise();

    return response.Result ?? false;
  }

  getSNSTestClient(topicStackId: string): SNSTestClient {
    //
    const topicArn = this.getResourceArnByStackId(topicStackId);

    if (topicArn === undefined) {
      throw new Error(`The topic ARN could not be resolved for id: ${topicStackId}`);
    }

    return new SNSTestClient(IntegrationTestClient.getRegion(), topicArn);
  }

  getSQSTestClient(queueStackId: string): SQSTestClient {
    //
    const queueUrl = this.getQueueUrlByStackId(queueStackId);

    if (queueUrl === undefined) {
      throw new Error(`The queue URL could not be resolved for id: ${queueStackId}`);
    }

    return new SQSTestClient(IntegrationTestClient.getRegion(), queueUrl);
  }

  getResourceArnByStackId(targetStackId: string): string | undefined {
    //
    if (this.testResourceTagMappingList === undefined)
      throw new Error('this.testResourceTagMappingList === undefined');

    const tagMatches = this.testResourceTagMappingList.filter(
      (r) =>
        r.Tags && r.Tags.some((t) => t.Key === this.props.testStackId && t.Value === targetStackId)
    );

    if (tagMatches.length === 0) {
      return undefined;
    }

    if (tagMatches.length > 1) {
      throw new Error(
        `Found ${
          tagMatches.length
        } matches for ${targetStackId}, when 1 was expected: ${JSON.stringify(tagMatches)}`
      );
    }

    const tagMatchArn = tagMatches[0].ResourceARN ?? 'undefined';
    return tagMatchArn;
  }

  // https://docs.aws.amazon.com/service-authorization/latest/reference/reference_policies_actions-resources-contextkeys.html
  static readonly ResourceNamePatterns = {
    // arn:${Partition}:sqs:${Region}:${Account}:${QueueName}
    queue: new RegExp(
      `^arn:aws:sqs:${IntegrationTestClient.getRegion()}:(?<account>[0-9]+):(?<name>.*)`
    ),
    // arn:${Partition}:s3:::${BucketName}
    bucket: /^arn:aws:s3:::(?<name>.*)/,
    // arn:${Partition}:dynamodb:${Region}:${Account}:table/${TableName}
    table: new RegExp(
      `^arn:aws:dynamodb:${IntegrationTestClient.getRegion()}:[0-9]+:table/(?<name>.*)`
    ),
    // arn:${Partition}:lambda:${Region}:${Account}:function:${FunctionName}:${Version}
    function: new RegExp(
      `^arn:aws:lambda:${IntegrationTestClient.getRegion()}:[0-9]+:function:(?<name>[^:]*)`
    ),
  };

  getQueueUrlByStackId(targetStackId: string): string | undefined {
    //
    const arn = this.getResourceArnByStackId(targetStackId);

    if (arn === undefined) {
      return undefined;
    }

    const arnMatch = arn.match(IntegrationTestClient.ResourceNamePatterns.queue);

    if (!arnMatch || !arnMatch.groups?.account || !arnMatch.groups?.name) {
      throw new Error(`ARN did not match expected pattern: ${arn}`);
    }

    const queueUrl = `https://sqs.${IntegrationTestClient.getRegion()}.amazonaws.com/${
      arnMatch.groups.account
    }/${arnMatch.groups?.name}`;

    return queueUrl;
  }

  getBucketNameByStackId(targetStackId: string): string | undefined {
    const resourceName = this.getResourceNameFromArn(
      targetStackId,
      IntegrationTestClient.ResourceNamePatterns.bucket
    );
    return resourceName;
  }

  getTableNameByStackId(targetStackId: string): string | undefined {
    const resourceName = this.getResourceNameFromArn(
      targetStackId,
      IntegrationTestClient.ResourceNamePatterns.table
    );
    return resourceName;
  }

  getFunctionNameByStackId(targetStackId: string): string | undefined {
    const resourceName = this.getResourceNameFromArn(
      targetStackId,
      IntegrationTestClient.ResourceNamePatterns.function
    );
    return resourceName;
  }

  // Private --------------------------------------------------------

  private static getArgSwitchValue(switchKey: string): string | undefined {
    //
    let switchValue: string | undefined;

    const switchKeyIndex = process.argv.findIndex((a) => a === `--${switchKey}`);

    if (switchKeyIndex !== -1) {
      //
      if (switchKeyIndex === process.argv.length - 1) {
        throw new Error(`Switch specified, but no corresponding value provided: ${switchKey}`);
      }

      switchValue = process.argv[switchKeyIndex + 1];
    }

    return switchValue;
  }

  private getResourceNameFromArn(targetStackId: string, arnPattern: RegExp): string | undefined {
    //
    const tagMatchArn = this.getResourceArnByStackId(targetStackId);

    if (tagMatchArn === undefined) {
      return undefined;
    }

    const arnMatch = tagMatchArn.match(arnPattern);

    if (!arnMatch || !arnMatch.groups?.name) {
      throw new Error(`ARN did not match expected pattern: ${tagMatchArn}`);
    }

    const resourceName = arnMatch.groups.name;
    return resourceName;
  }
}
