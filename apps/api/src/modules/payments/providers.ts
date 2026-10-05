import { env } from '../../config/env';

export type ProviderOrder = { id: string; amount: number; currency: string; raw?: unknown };
export type VerifyResult = {
  status: 'success' | 'failure' | 'pending';
  providerPaymentId?: string;
};
export type RefundResult = { ok: boolean };
export type WebhookEvent = { type: string; data: unknown };

export interface PaymentProvider {
  createOrder(input: {
    amount: number;
    currency: string;
    receipt: string;
  }): Promise<ProviderOrder>;
  verifyPayment(input: {
    providerOrderId: string;
    providerPaymentId?: string;
    forcedStatus?: 'success' | 'failure' | 'pending';
  }): Promise<VerifyResult>;
  refund(input: { providerPaymentId: string; amount: number }): Promise<RefundResult>;
  handleWebhook(body: unknown, signature?: string): Promise<WebhookEvent>;
}

export class MockPaymentProvider implements PaymentProvider {
  async createOrder(input: { amount: number; currency: string; receipt: string }) {
    return {
      id: `mock_order_${Date.now()}`,
      amount: input.amount,
      currency: input.currency,
      raw: { receipt: input.receipt, simulated: true },
    };
  }
  async verifyPayment(input: {
    providerOrderId: string;
    providerPaymentId?: string;
    forcedStatus?: 'success' | 'failure' | 'pending';
  }) {
    const status = input.forcedStatus ?? 'success';
    return {
      status,
      providerPaymentId: input.providerPaymentId ?? `mock_pay_${Date.now()}`,
    };
  }
  async refund() {
    return { ok: true };
  }
  async handleWebhook(body: unknown) {
    return { type: 'mock.event', data: body };
  }
}

export class RazorpayProvider implements PaymentProvider {
  async createOrder(input: { amount: number; currency: string; receipt: string }) {
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay keys not configured');
    }
    // Skeleton: wire real Razorpay SDK when keys present
    return {
      id: `rzp_order_skeleton_${Date.now()}`,
      amount: input.amount * 100,
      currency: input.currency,
      raw: { note: 'Replace with Razorpay orders.create', receipt: input.receipt },
    };
  }
  async verifyPayment() {
    return { status: 'pending' as const };
  }
  async refund() {
    return { ok: false };
  }
  async handleWebhook(body: unknown) {
    return { type: 'razorpay.event', data: body };
  }
}

export function getPaymentProvider(): PaymentProvider {
  return env.PAYMENT_PROVIDER === 'razorpay' ? new RazorpayProvider() : new MockPaymentProvider();
}
