/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from 'chai';
import { IntegrationTestClient, S3TestClient } from '../src';
import TempTestStack from './TempStack';

describe('Temp Test Suite', () => {
  //
  const testClient = new IntegrationTestClient({
    testStackId: TempTestStack.Id,
  });

  let testBucket: S3TestClient;

  before(async () => {
    await testClient.initialiseClientAsync();

    testBucket = testClient.getS3TestClient(TempTestStack.TestBucketId);
  });

  beforeEach(async () => {
    await testClient.initialiseTestAsync();
    await testBucket.clearAllObjectsAsync();
  });

  it(`Retrieves object from S3`, async () => {
    // Arrange
    const key = 'key';
    const expectedObject = { name: 'value' };
    await testBucket.uploadObjectAsync(key, expectedObject);

    // Act
    const actualObject = await testBucket.getObjectAsync(key);

    // Await
    
    // Assert
    expect(actualObject).to.deep.equal(expectedObject);
  });

  it(`Returns undefined if object does not exist`, async () => {
    // Arrange
    const key = 'key';
    const uploadedObject = { name: 'value' };
    await testBucket.uploadObjectAsync(key, uploadedObject);

    // Act
    const actualObject = await testBucket.getObjectAsync('unknown-key');

    // Await

    // Assert
    expect(actualObject).to.be.undefined;
  });
});
