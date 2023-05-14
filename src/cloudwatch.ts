// Copied from https://github.com/erezrokah/aws-testing-library

/* eslint-disable array-callback-return */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  CloudWatchLogsClient,
  DeleteLogStreamCommand,
  DescribeLogStreamsCommand,
  FilterLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';

const getLogGroupName = (functionName: string) => `/aws/lambda/${functionName}`;

export const filterLogEvents = async (
  region: string,
  functionName: string,
  startTime: number,
  pattern: string
) => {
  const cloudWatchLogsClient = new CloudWatchLogsClient({ region });
  const logGroupName = getLogGroupName(functionName);
  const filterPattern = `"${pattern}"`; // enclose with "" to support special characters

  const { events = [] } = await cloudWatchLogsClient.send(
    new FilterLogEventsCommand({
      filterPattern,
      interleaved: true,
      limit: 1,
      logGroupName,
      startTime,
    })
  );

  return { events };
};

const getLogStreams = async (region: string, functionName: string) => {
  const cloudWatchLogsClient = new CloudWatchLogsClient({ region });
  const logGroupName = getLogGroupName(functionName);

  const { logStreams = [] } = await cloudWatchLogsClient.send(
    new DescribeLogStreamsCommand({
      descending: true,
      logGroupName,
      orderBy: 'LastEventTime',
    })
  );

  return { logStreams };
};

export const deleteAllLogs = async (region: string, functionName: string) => {
  const { logStreams } = await getLogStreams(region, functionName);
  if (logStreams.length <= 0) {
    return;
  }
  const cloudWatchLogsClient = new CloudWatchLogsClient({ region });
  const logGroupName = getLogGroupName(functionName);

  const logStreamNames = logStreams.map((s) => s.logStreamName || '');

  await Promise.all(
    logStreamNames.map((logStreamName) =>
      cloudWatchLogsClient.send(new DeleteLogStreamCommand({ logGroupName, logStreamName }))
    )
  );
};
