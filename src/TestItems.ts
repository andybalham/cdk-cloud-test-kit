import TestObservation from './TestObservation';
import { TestProps } from './TestProps';

export enum TestItemPrefix {
  TestInput = 'TestInput',
  // eslint-disable-next-line @typescript-eslint/no-shadow
  TestObservation = 'TestObservation',
  FunctionState = 'FunctionState',
}

export interface TestItemKey {
  PK: string;
  SK: string;
}

export interface CurrentTestItem extends TestItemKey {
  props: TestProps;
}

export interface ObservationTestItem extends TestItemKey {
  observation: TestObservation;
}

export interface FunctionStateTestItem extends TestItemKey {
  state: Record<string, any>;
}
