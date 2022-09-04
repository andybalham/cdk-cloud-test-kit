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
  ssn: string;
  address: Address;
}

export interface Address {
  lines: string[];
  zipCode: string;
}
