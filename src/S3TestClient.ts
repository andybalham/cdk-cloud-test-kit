// eslint-disable-next-line import/no-extraneous-dependencies
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { clearAllObjects, getObjectStringAsync } from './s3';

export default class S3TestClient {
  //
  readonly s3Client: S3Client;

  constructor(public readonly region: string, public readonly bucketName: string) {
    this.s3Client = new S3Client({ region });
  }

  async uploadObjectAsync(key: string, object: Record<string, any>): Promise<void> {
    //
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: JSON.stringify(object),
      })
    );
  }

  async getObjectAsync(key: string): Promise<Record<string, any> | undefined> {
    const objectString = await getObjectStringAsync(this.region, this.bucketName, key);
    return objectString ? JSON.parse(objectString) : undefined;
  }

  async clearAllObjectsAsync(prefix?: string): Promise<void> {
    await clearAllObjects(this.region, this.bucketName, prefix);
  }
}
