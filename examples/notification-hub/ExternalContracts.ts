export enum CaseEventType {
  CaseStatusUpdated = 'CaseStatusUpdated',
  CasePaymentRequiredEvent = 'CasePaymentRequiredEvent',
}

export interface CaseEvent {
  eventType: CaseEventType;
  lenderId: string; // loans-r-us
  distributorId: string; // money-cattle-market
  caseId: string;
}

export enum CaseStatus {
  Accepted = 'Accepted',
  Referred = 'Referred',
  Declined = 'Declined',
}

export interface CaseStatusUpdatedEvent extends CaseEvent {
  oldStatus?: CaseStatus;
  newStatus: CaseStatus;
  statusChangedDate: string;
}

export interface CasePaymentRequiredEvent extends CaseEvent {
  paymentId: string;
  total: number;
  description: string;
}
