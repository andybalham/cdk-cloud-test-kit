![CDK Cloud Test Kit logo](https://github.com/andybalham/cdk-cloud-test-kit/blob/main/images/cdk-cloud-test-kit-logo.png?raw=true)

# CDK Cloud Test Kit

The CDK Cloud Test Kit is a set of [TypeScript](https://www.typescriptlang.org/) classes, with the aim of making it straightforward to test [CDK constructs](https://docs.aws.amazon.com/cdk/v2/guide/constructs.html) in the cloud.

The approach is based on two key classes:

- `IntegrationTestStack` - A base [`Stack`](https://docs.aws.amazon.com/cdk/latest/guide/stacks.html), used to deploy the construct under test along with any test drivers and test observers.
- `IntegrationTestClient` - A class that is used to drive the construct under test and to poll for the resulting test observations.

![Overview of package classes](https://github.com/andybalham/cdk-cloud-test-kit/blob/main/images/cdk-cloud-test-kit-overview.png?raw=true)

`IntegrationTestStack` is an abstract class, derived from the CDK [Stack](https://docs.aws.amazon.com/cdk/latest/guide/stacks.html) class, that provides the following functionality:

- Easy deployment of common test resource scaffolding, such as observer Lambda functions and a DynamoDB table for recording observations.
- A method to tag the deployed resources, so that they can be discovered, invoked, nd read without needing to know the resource names or ARNs.

`IntegrationTestClient` is a class that works in conjunction with the `IntegrationTestStack` that provides the following functionality:

- A set of methods to locate and interact with the deployed test resources using the [AWS SDK](https://aws.amazon.com/sdk-for-javascript/). For example, to upload an object to an S3 bucket or publish an event to an SNS topic.
- A method to poll for test observations, making writing asynchronous unit tests simple and clear.

The best way to see what the `cdk-cloud-test-kit` can do for you is to look at the examples or, better still, run them.

## Examples

### [Simple Event Router](https://github.com/andybalham/cdk-cloud-test-kit/blob/main/examples/simple-event-router)

This example tests a construct that encapsulates a simple SNS event router. It demonstrates how the toolkit can publish test events and observe the effects to validate the behaviour.

### [Simple Message Router](https://github.com/andybalham/cdk-cloud-test-kit/blob/main/examples/simple-message-router)

This example is similar to the Simple Event Router, but uses SQS queues with DLQs instead of SNS topics. It demonstrates how the toolkit can be used to test error conditions with the use of mock Lambda function responses.

### [Loan Processor State Machine](https://github.com/andybalham/cdk-cloud-test-kit/blob/main/examples/loan-processor-state-machine)

This example demonstrates how the toolkit can be used to test step functions. It shows how the toolkit can be used to execute and monitor step functions and how it can be used to exercise all the step function branches with the use of mock responses. In addition, it demonstrates how the toolkit can be used to observe DynamoDB table events along with SQS queues and SNS topics.

### [Notification Hub](https://github.com/andybalham/cdk-cloud-test-kit/blob/main/examples/notification-hub)

This example shows how the toolkit can be used to put events on an EventBridge event bus. It also shows how the toolkit can be used to test event patterns, both prior to deployment and also once the rules are deployed.

### [Request API](https://github.com/andybalham/cdk-cloud-test-kit/blob/main/examples/request-api)

This example shows how the toolkit can be used to help invoke API Gateway instances and how it can be used to create custom observers that can be used to record any sort of observation you like.
