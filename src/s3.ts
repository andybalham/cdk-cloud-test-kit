// Copied from https://github.com/erezrokah/aws-testing-library

/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';

const listAllKeys = async (
  region: string,
  bucket: string,
  prefix: string | undefined,
  token: string | undefined
) => {
  const s3Client = new S3Client({ region });
  const opts = {
    Bucket: bucket,
    ContinuationToken: token,
    ...(prefix && { Prefix: prefix }),
  };
  const data = await s3Client.send(new ListObjectsV2Command(opts));
  let allKeys = data.Contents || [];
  if (data.IsTruncated) {
    allKeys = allKeys.concat(await listAllKeys(region, bucket, prefix, data.NextContinuationToken));
  }

  return allKeys;
};

export const clearAllObjects = async (region: string, bucket: string, prefix?: string) => {
  const allKeys = await listAllKeys(region, bucket, prefix, undefined);
  if (allKeys.length > 0) {
    const s3Client = new S3Client({ region });
    const objects = allKeys.map((item) => ({ Key: item.Key || '' }));
    await s3Client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: objects,
          Quiet: false,
        },
      })
    );
  }
};

export const getObjectStringAsync = async (
  region: string,
  bucket: string,
  key: string
): Promise<string | undefined> => {
  try {
    const s3Client = new S3Client({ region });
    // throws error if key not found
    const getObjectCommandOutput = await s3Client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key })
    );
    const bodyString = await getObjectCommandOutput.Body?.transformToString();
    return bodyString;
  } catch (e: any) {
    if (e.name === 'NoSuchKey') {
      return undefined;
    }
    throw e;
  }
};
