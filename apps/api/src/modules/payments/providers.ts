import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '../../config/env';
import { AppError } from '../../lib/errors';

export type ProviderOrder = { id: string; amount: number; currency: string; raw?: unknown };
export type VerifyResult = {
  status: 'success' | 'failure' | 'pending';
  providerPaymentId?: string;
};
export type RefundResult = { ok: boolean; providerRefundId?: string };
export type WebhookEvent = { type: string; data: unknown };

export interface PaymentProvider {
  createOrder(input: { amount: number; currency: string; receipt: string }): Promise<ProviderOrder>;
  verifyPayment(input: {
    providerOrderId: string;
    providerPaymentId?: string;
    signature?: string;
    forcedStatus?: 'success' | 'failure' | 'pending';
  }): Promise<VerifyResult>;
  refund(input: { providerPaymentId: string; amount: number }): Promise<RefundResult>;
  handleWebhook(input: { body: unknown; rawBody?: Buffer }, signature?: string): Promise<WebhookEvent>;
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
    return { status, providerPaymentId: input.providerPaymentId ?? `mock_pay_${Date.now()}` };
  }
  async refund() {
    return { ok: true, providerRefundId: `mock_refund_${Date.now()}` };
  }
  async handleWebhook(input: { body: unknown }) {
    return { type: 'mock.event', data: input.body };
  }
}

async function razorpayRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new AppError(503, 'PAYMENT_PROVIDER_NOT_CONFIGURED', 'Razorpay credentials are not configured');
  }
  const authorization = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${authorization}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AppError(502, 'PAYMENT_PROVIDER_ERROR', 'Razorpay request failed', data);
  }
  return data as T;
}

function matchesHmac(payload: string | Buffer, expected: string, secret: string) {
  const digest = createHmac('sha256', secret).update(payload).digest();
  const actual = Buffer.from(expected, 'hex');
  return actual.length === digest.length && timingSafeEqual(actual, digest);
}

export class RazorpayProvider implements PaymentProvider {
  async createOrder(input: { amount: number; currency: string; receipt: string }) {
    const order = await razorpayRequest<{ id: string; amount: number; currency: string }>('/orders', {
      method: 'POST',
      body: JSON.stringify({ amount: input.amount * 100, currency: input.currency, receipt: input.receipt }),
    });
    return { id: order.id, amount: input.amount, currency: order.currency, raw: order };
  }

  async verifyPayment(input: { providerOrderId: string; providerPaymentId?: string; signature?: string }) {
    if (!input.providerPaymentId || !input.signature) {
      throw new AppError(400, 'PAYMENT_SIGNATURE_REQUIRED', 'Razorpay payment ID and signature are required');
    }
    if (!env.RAZORPAY_KEY_SECRET || !matchesHmac(`${input.providerOrderId}|${input.providerPaymentId}`, input.signature, env.RAZORPAY_KEY_SECRET)) {
      throw new AppError(400, 'INVALID_PAYMENT_SIGNATURE', 'Razorpay signature could not be verified');
    }
    const payment = await razorpayRequest<{ order_id: string; status: string }>(`/payments/${encodeURIComponent(input.providerPaymentId)}`);
    if (payment.order_id !== input.providerOrderId) {
      throw new AppError(400, 'PAYMENT_ORDER_MISMATCH', 'Payment does not belong to this order');
    }
    return {
      status: payment.status === 'captured' ? 'success' : payment.status === 'failed' ? 'failure' : 'pending',
      providerPaymentId: input.providerPaymentId,
    };
  }

  async refund(input: { providerPaymentId: string; amount: number }) {
    if (!input.providerPaymentId) throw new AppError(400, 'PAYMENT_NOT_CAPTURED', 'A captured payment is required to refund');
    const refund = await razorpayRequest<{ id: string }>('/payments/' + encodeURIComponent(input.providerPaymentId) + '/refund', {
      method: 'POST',
      body: JSON.stringify({ amount: input.amount * 100 }),
    });
    return { ok: Boolean(refund.id), providerRefundId: refund.id };
  }

  async handleWebhook(input: { body: unknown; rawBody?: Buffer }, signature?: string) {
    if (!env.RAZORPAY_WEBHOOK_SECRET || !signature || !input.rawBody) {
      throw new AppError(503, 'WEBHOOK_NOT_CONFIGURED', 'Razorpay webhook verification is not configured');
    }
    if (!matchesHmac(input.rawBody, signature, env.RAZORPAY_WEBHOOK_SECRET)) {
      throw new AppError(401, 'INVALID_WEBHOOK_SIGNATURE', 'Razorpay webhook signature is invalid');
    }
    return { type: 'razorpay.event', data: input.body };
  }
}

export function getPaymentProvider(name = env.PAYMENT_PROVIDER): PaymentProvider {
  if (name !== env.PAYMENT_PROVIDER) throw new AppError(404, 'PROVIDER_NOT_FOUND', 'Payment provider is not enabled');
  return name === 'razorpay' ? new RazorpayProvider() : new MockPaymentProvider();
}
