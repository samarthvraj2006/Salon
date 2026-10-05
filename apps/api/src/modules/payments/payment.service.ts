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
  const provider = getPaymentProvider();
  const result = await provider.verifyPayment({
    providerOrderId: body.providerOrderId,
    providerPaymentId: body.providerPaymentId,
    forcedStatus: body.status,
  });
  const status =
    result.status === 'success'
      ? PaymentStatus.PAID
      : result.status === 'pending'
        ? PaymentStatus.PENDING
        : PaymentStatus.FAILED;
  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status,
      providerPaymentId: result.providerPaymentId ?? body.providerPaymentId,
    },
  });
  await prisma.appointment.update({
    where: { id: payment.appointmentId },
    data: { paymentStatus: status },
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
  const provider = getPaymentProvider();
  await provider.refund({
    providerPaymentId: payment.providerPaymentId ?? payment.providerOrderId ?? '',
    amount: payment.amount,
  });
  return prisma.payment.update({
    where: { id: paymentId },
    data: { status: PaymentStatus.REFUNDED },
  });
}
