// eslint-disable-next-line import/no-extraneous-dependencies
import AWS from 'aws-sdk';
import { clearAllObjects } from './s3';

export default class S3TestClient {
  //
  readonly s3: AWS.S3;

  constructor(public readonly region: string, public readonly bucketName: string) {
    this.s3 = new AWS.S3({ region });
  }

  async uploadObjectAsync(key: string, object: Record<string, any>): Promise<void> {
    //
    await this.s3
      .upload({
        Bucket: this.bucketName,
        Key: key,
        Body: JSON.stringify(object),
      })
      .promise();
  }

  async clearAllObjectsAsync(prefix?: string): Promise<void> {
    await clearAllObjects(this.region, this.bucketName, prefix);
  }
}
