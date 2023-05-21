import { Construct } from 'constructs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { IntegrationTestStack } from '../src';

export default class TempTestStack extends IntegrationTestStack {
  //
  static readonly Id = `TempTestStack`;

  static readonly TestBucketId = 'TestBucket';

  constructor(scope: Construct, id: string) {
    //
    super(scope, id, {
      testStackId: TempTestStack.Id,
    });

    const testBucket = new Bucket(this, TempTestStack.TestBucketId);

    this.addTestResourceTag(testBucket, TempTestStack.TestBucketId);
  }
}
