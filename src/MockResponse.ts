export interface MockResponse {
  payload?: any;
  error?: string;
  repeat?: 'FOREVER' | number;
}
