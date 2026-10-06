import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { createPaymentOrderSchema, verifyPaymentSchema } from '@salonslot/shared';
import { env } from '../../config/env';
import { AppError, assertFound } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { getPaymentProvider } from './providers';
import { notifyUser } from '../notifications/notify.service';

export async function listMethods() {
  return [
    { id: 'UPI', label: 'UPI', enabled: true },
    { id: 'CARD', label: 'Cards', enabled: true },
    { id: 'NETBANKING', label: 'Net Banking', enabled: true },
    { id: 'WALLET', label: 'Wallets', enabled: true },
  ];
}

export async function createOrder(userId: string, raw: unknown) {
  const body = createPaymentOrderSchema.parse(raw);
  const appt = assertFound(
    await prisma.appointment.findUnique({ where: { id: body.appointmentId } }),
  );
  if (appt.customerId !== userId) throw new AppError(403, 'FORBIDDEN', 'Not your booking');
  if (appt.status === 'CANCELLED') throw new AppError(400, 'BOOKING_CANCELLED', 'Cannot pay for a cancelled booking');
  if (appt.paymentStatus === PaymentStatus.PAID) {
    throw new AppError(400, 'ALREADY_PAID', 'Already paid');
  }
  const provider = getPaymentProvider();
  const order = await provider.createOrder({
    amount: appt.totalAmount,
    currency: 'INR',
    receipt: appt.bookingCode,
  });
  const payment = await prisma.payment.upsert({
    where: { appointmentId: appt.id },
    create: {
      appointmentId: appt.id,
      userId,
      amount: appt.totalAmount,
      method: body.method as PaymentMethod,
      status: PaymentStatus.PENDING,
      provider: env.PAYMENT_PROVIDER,
      providerOrderId: order.id,
      metadata: order.raw,
    },
    update: {
      method: body.method as PaymentMethod,
      providerOrderId: order.id,
      status: PaymentStatus.PENDING,
      metadata: order.raw,
    },
  });
  await prisma.appointment.update({
    where: { id: appt.id },
    data: { paymentStatus: PaymentStatus.PENDING },
  });
  return { payment, order };
}

export async function verifyPayment(userId: string, raw: unknown) {
  const body = verifyPaymentSchema.parse(raw);
  const payment = assertFound(await prisma.payment.findUnique({ where: { id: body.paymentId } }));
  if (payment.userId !== userId) throw new AppError(403, 'FORBIDDEN', 'Not your payment');
  if (payment.providerOrderId !== body.providerOrderId) {
    throw new AppError(400, 'PAYMENT_ORDER_MISMATCH', 'Payment order does not match this booking');
  }
  if (payment.status === PaymentStatus.PAID) return payment;
  if (payment.status === PaymentStatus.REFUNDED) throw new AppError(400, 'PAYMENT_REFUNDED', 'This payment has been refunded');
  const provider = getPaymentProvider();
  const result = await provider.verifyPayment({
    providerOrderId: body.providerOrderId,
    providerPaymentId: body.providerPaymentId,
    signature: body.signature,
    forcedStatus: body.status,
  });
  const status =
    result.status === 'success'
      ? PaymentStatus.PAID
      : result.status === 'pending'
        ? PaymentStatus.PENDING
        : PaymentStatus.FAILED;
  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.payment.update({
      where: { id: payment.id },
      data: { status, providerPaymentId: result.providerPaymentId ?? body.providerPaymentId },
    });
    await tx.appointment.update({ where: { id: payment.appointmentId }, data: { paymentStatus: status } });
    return saved;
  });
  await notifyUser(userId, {
    title: status === PaymentStatus.PAID ? 'Payment successful' : 'Payment update',
    body:
      status === PaymentStatus.PAID
        ? 'Your online payment was successful.'
        : `Payment status: ${status}`,
    data: { type: 'payment', paymentId: payment.id },
  });
  return updated;
}

export async function paymentHistory(userId: string) {
  return prisma.payment.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { appointment: true },
  });
}

export async function refundPayment(userId: string, paymentId: string) {
  const payment = assertFound(await prisma.payment.findUnique({ where: { id: paymentId } }));
  if (payment.userId !== userId) throw new AppError(403, 'FORBIDDEN', 'Not your payment');
  if (payment.status === PaymentStatus.REFUNDED) return payment;
  if (payment.status !== PaymentStatus.PAID) throw new AppError(400, 'PAYMENT_NOT_PAID', 'Only successful payments can be refunded');
  const provider = getPaymentProvider();
  const result = await provider.refund({
    providerPaymentId: payment.providerPaymentId ?? payment.providerOrderId ?? '',
    amount: payment.amount,
  });
  if (!result.ok) throw new AppError(502, 'REFUND_FAILED', 'The payment provider could not process the refund');
  return prisma.$transaction(async (tx) => {
    const updated = await tx.payment.update({ where: { id: paymentId }, data: { status: PaymentStatus.REFUNDED } });
    await tx.appointment.update({ where: { id: payment.appointmentId }, data: { paymentStatus: PaymentStatus.REFUNDED } });
    return updated;
  });
}

export async function refundPaymentForCancellation(payment: {
  id: string;
  appointmentId: string;
  userId: string;
  amount: number;
  providerPaymentId: string | null;
  providerOrderId: string | null;
  status: PaymentStatus;
}) {
  if (payment.status === PaymentStatus.REFUNDED) return;
  if (payment.status !== PaymentStatus.PAID) return;
  const result = await getPaymentProvider().refund({
    providerPaymentId: payment.providerPaymentId ?? payment.providerOrderId ?? '',
    amount: payment.amount,
  });
  if (!result.ok) throw new AppError(502, 'REFUND_FAILED', 'Booking cancelled, but the payment refund could not be processed');
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.REFUNDED } });
    await tx.appointment.update({ where: { id: payment.appointmentId }, data: { paymentStatus: PaymentStatus.REFUNDED } });
  });
}

export async function handlePaymentWebhook(input: { provider: string; body: unknown; rawBody?: Buffer; signature?: string }) {
  const event = await getPaymentProvider(input.provider).handleWebhook(
    { body: input.body, rawBody: input.rawBody },
    input.signature,
  );
  const payload = event.data as any;
  const entity = payload?.payload?.payment?.entity;
  if (!entity?.order_id) return { ok: true, event: event.type, applied: false };

  const status = event.type === 'payment.captured'
    ? PaymentStatus.PAID
    : event.type === 'payment.failed'
      ? PaymentStatus.FAILED
      : undefined;
  if (!status) return { ok: true, event: event.type, applied: false };

  const payment = await prisma.payment.findFirst({ where: { providerOrderId: entity.order_id } });
  if (!payment) return { ok: true, event: event.type, applied: false };
  if (payment.status === PaymentStatus.PAID || payment.status === PaymentStatus.REFUNDED) {
    return { ok: true, event: event.type, applied: false };
  }
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: { status, providerPaymentId: entity.id ?? payment.providerPaymentId },
    });
    await tx.appointment.update({ where: { id: payment.appointmentId }, data: { paymentStatus: status } });
  });
  await notifyUser(payment.userId, {
    title: status === PaymentStatus.PAID ? 'Payment successful' : 'Payment failed',
    body: status === PaymentStatus.PAID ? 'Your online payment was successful.' : 'Your online payment did not go through.',
    data: { type: 'payment', paymentId: payment.id },
  });
  return { ok: true, event: event.type, applied: true };
}
