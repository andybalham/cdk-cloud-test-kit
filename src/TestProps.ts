import { MockResponse } from './MockResponse';

export interface TestProps {
  testId: string;
  inputs?: Record<string, any>;
  mockResponses?: Record<string, MockResponse[]>;
}
