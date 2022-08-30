import { Construct } from 'constructs';
import { IntegrationTestStack } from '../../src';
import RequestApi from './RequestApi';

export default class RequestApiTestStack extends IntegrationTestStack {
  //
  static readonly Id = `RequestApiTestStack`;

  static readonly RequestApiId = `RequestApiId`;

  constructor(scope: Construct, id: string) {
    super(scope, id, {
      testStackId: RequestApiTestStack.Id,
      testFunctionIds: ['TempObserver'],
    });

    // SUT

    const sut = new RequestApi(this, 'SUT', {
      handlerFunction: this.testFunctions.TempObserver,
    });

    this.addTestResourceTag(sut.api, RequestApiTestStack.RequestApiId);
  }
}
