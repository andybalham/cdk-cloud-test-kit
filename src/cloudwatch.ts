// Copied from https://github.com/erezrokah/aws-testing-library

/* eslint-disable array-callback-return */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import AWS = require('aws-sdk');

const getLogGroupName = (functionName: string) => `/aws/lambda/${functionName}`;

export const filterLogEvents = async (
  region: string,
  functionName: string,
  startTime: number,
  pattern: string
) => {
  const cloudWatchLogs = new AWS.CloudWatchLogs({ region });
  const logGroupName = getLogGroupName(functionName);
  const filterPattern = `"${pattern}"`; // enclose with "" to support special characters

  const { events = [] } = await cloudWatchLogs
    .filterLogEvents({
      filterPattern,
      interleaved: true,
      limit: 1,
      logGroupName,
      startTime,
    })
    .promise();

  return { events };
};

const getLogStreams = async (region: string, functionName: string) => {
  const cloudWatchLogs = new AWS.CloudWatchLogs({ region });
  const logGroupName = getLogGroupName(functionName);

  const { logStreams = [] } = await cloudWatchLogs
    .describeLogStreams({
      descending: true,
      logGroupName,
      orderBy: 'LastEventTime',
    })
    .promise();

  return { logStreams };
};

export const deleteAllLogs = async (region: string, functionName: string) => {
  const { logStreams } = await getLogStreams(region, functionName);
  if (logStreams.length <= 0) {
    return;
  }
  const cloudWatchLogs = new AWS.CloudWatchLogs({ region });
  const logGroupName = getLogGroupName(functionName);

  const logStreamNames = logStreams.map((s) => s.logStreamName || '');

  await Promise.all(
    logStreamNames.map((logStreamName) =>
      cloudWatchLogs.deleteLogStream({ logGroupName, logStreamName }).promise()
    )
  );
};
