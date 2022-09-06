export interface LoanApplicationDetails {
  personalDetails: PersonalDetails;
  loanDetails: LoanDetails;
}

export interface LoanDetails {
  amount: number;
  termMonths: number;
}

export interface PersonalDetails {
  firstName: string;
  lastName: string;
  niNumber: string;
  address: Address;
}

export interface Address {
  lines: string[];
  postcode: string;
}
