# Loan Processor State Machine

## Overview

This example demonstrates how the toolkit can be used to test step functions. It shows how the toolkit can be used to execute and monitor step functions and how it can be used to exercise all the step function branches with the use of mock responses. In addition, it demonstrates how the toolkit can be used to observe DynamoDB table events along with SQS queues and SNS topics.

The state machine used is shown below.

![Loan Processor State Machine](https://raw.githubusercontent.com/andybalham/sls-testing-toolkit/main/examples/loan-processor-state-machine/images/loan-processor-step-function.png)

The state machine is tested by hosting it in a test stack, shown below.

![Loan Processor Test Stack](https://raw.githubusercontent.com/andybalham/sls-testing-toolkit/main/examples/loan-processor-state-machine/images/loan-processor-test-stack.jpg)

The test stack has a mock for the credit rating function, so we can test all routes including errors. The test stack also provides the other resources required by the state machine, a DynamoDB table, an SQS queue, and an SNS topic. These are all observed by test functions that record the observations in a unit test table for verification.
