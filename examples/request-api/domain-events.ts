/* eslint-disable max-classes-per-file */

export class EventDomain {
  static readonly LoanBroker = 'LoanBroker';
}

export class EventService {
  static readonly RequestApi = 'RequestApi';
}

export class EventDetailType {
  static readonly LoanApplicationSubmitted = 'LoanApplicationSubmitted';
}

// TODO 04Sep22: Look at https://www.boyney.io/blog/2022-02-11-event-payload-patterns

export interface EventBridgePayload<TData> {
  metadata: {
    correlationId: string;
    service: string;
    domain: string;
  };
  data: TData;
}

export type LoanApplicationSubmitted = EventBridgePayload<{
  loanApplicationReference: string;
  loanApplicationDetailsUrl: string;
}>;
