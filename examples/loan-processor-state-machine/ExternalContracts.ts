import * as dynamodb from '@aws-cdk/aws-dynamodb';

export interface LoanDetails {
  firstName: string;
  lastName: string;
  postcode: string;
  email: string;
}

export interface CreditRatingRequest {
  firstName: string;
  lastName: string;
  postcode: string;
}

export enum CreditRating {
  Good = 'GOOD',
  Bad = 'BAD',
}

export interface CreditRatingResponse {
  value: CreditRating;
}

export interface EmailEvent {
  email: string;
  message: string;
}

export interface LoanItem {
  id: string;
  loanDetails: LoanDetails;
}

export const LoanTableSchema = {
  partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
};
