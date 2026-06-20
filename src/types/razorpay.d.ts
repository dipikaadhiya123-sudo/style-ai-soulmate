interface RazorpayOptions {
  key: string;
  subscription_id?: string;
  amount?: number;
  currency?: string;
  name?: string;
  description?: string;
  order_id?: string;
  notes?: Record<string, string>;
  handler?: (response: RazorpayResponse) => void;
  theme?: { color?: string };
}
interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_signature?: string;
}
interface RazorpayInstance {
  on(event: string, callback: (response: any) => void): void;
  open(): void;
}
interface Window {
  Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
}