import { AppointmentStatus, PaymentStatus, Prisma } from '@prisma/client';
import { randomInt } from 'crypto';
import { createAppointmentSchema, cancelAppointmentSchema, rescheduleSchema } from '@salonslot/shared';
import { AppError, assertFound } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { getSalonSlotsWithClient, combineDateAndTime } from '../slots/slot.service';
import { parseHm } from '../slots/slot.utils';
import { validateAndQuotePromo } from '../promotions/promo.service';
import { notifyUser } from '../notifications/notify.service';
import { refundPaymentForCancellation } from '../payments/payment.service';

function bookingCode() {
  return `SS${randomInt(10_000_000, 100_000_000)}`;
}

export async function createAppointment(userId: string, raw: unknown) {
  const input = createAppointmentSchema.parse(raw);
  try {
    const appointment = await prisma.$transaction(
      async (tx) => {
        const salon = assertFound(await tx.salon.findUnique({
          where: { id: input.salonId },
          include: { services: { where: { id: { in: input.serviceIds }, isActive: true } }, place: true },
        }));
        if (salon.services.length !== input.serviceIds.length) {
          throw new AppError(400, 'INVALID_SERVICES', 'One or more selected services are no longer available');
        }

        const duration = salon.services.reduce((sum, service) => sum + service.durationMin, 0);
        const subtotal = salon.services.reduce((sum, service) => sum + service.priceInr, 0);
        const quote = input.couponCode
          ? await validateAndQuotePromo({ code: input.couponCode, salonId: salon.id, amount: subtotal, userId }, tx)
          : undefined;
        const discount = quote?.discount ?? 0;
        const total = Math.max(0, subtotal - discount);

        // Availability, staff eligibility, working hours, breaks and blocks are
        // read again in this serializable transaction immediately before insert.
        const slotInfo = await getSalonSlotsWithClient(tx, {
          salonId: salon.id,
          date: input.date,
          serviceIds: input.serviceIds,
          staffId: input.staffId ?? 'any',
        });
        const slot = slotInfo.slots.find((candidate) => candidate.time === input.startTime && candidate.available);
        if (!slot?.staffIds.length) throw new AppError(409, 'SLOT_TAKEN', 'Selected slot is no longer available');
        if (input.staffId && !slot.staffIds.includes(input.staffId)) {
          throw new AppError(409, 'STAFF_UNAVAILABLE', 'Selected stylist is not available for this slot');
        }
        const staffId = input.staffId ?? slot.staffIds[0];
        const startTime = combineDateAndTime(input.date, input.startTime);
        const endMin = parseHm(input.startTime) + duration;
        if (endMin > 24 * 60) throw new AppError(400, 'INVALID_SLOT', 'Appointment cannot continue past midnight');
        const endHm = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
        const endTime = combineDateAndTime(input.date, endHm);

        const conflict = await tx.appointment.findFirst({
          where: {
            staffId,
            status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        });
        if (conflict) throw new AppError(409, 'SLOT_TAKEN', 'Selected slot is no longer available');

        if (quote) {
          const currentPromo = await tx.promotion.findUnique({ where: { id: quote.promotionId } });
          if (!currentPromo || (currentPromo.usageLimit != null && currentPromo.usedCount >= currentPromo.usageLimit)) {
            throw new AppError(409, 'COUPON_EXHAUSTED', 'Coupon usage limit reached');
          }
        }

        const appt = await tx.appointment.create({
          data: {
            bookingCode: bookingCode(),
            customerId: userId,
            salonId: salon.id,
            staffId,
            date: new Date(input.date),
            startTime,
            endTime,
            status: AppointmentStatus.CONFIRMED,
            paymentStatus: input.paymentMethod === 'ONLINE' ? PaymentStatus.PENDING : PaymentStatus.PAY_AT_SALON,
            totalAmount: total,
            discountAmount: discount,
            services: {
              create: salon.services.map((s) => ({
                serviceId: s.id,
                priceInr: s.priceInr,
                durationMin: s.durationMin,
              })),
            },
          },
          include: {
            services: { include: { service: true } },
            salon: { include: { place: true } },
            staff: true,
            customer: true,
          },
        });

        if (quote) {
          await tx.promotionRedemption.create({
            data: {
              promotionId: quote.promotionId,
              userId,
              appointmentId: appt.id,
              discountAmount: discount,
            },
          });
          await tx.promotion.update({
            where: { id: quote.promotionId },
            data: { usedCount: { increment: 1 } },
          });
        }
        return appt;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await notifyUser(userId, {
      title: 'Booking confirmed',
      body: `Your appointment at ${appointment.salon.place.name} is confirmed (${appointment.bookingCode}).`,
      data: { appointmentId: appointment.id, type: 'booking_confirmed' },
    });

    return appointment;
  } catch (e) {
    if (e instanceof AppError) throw e;
    if (e instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2004', 'P2034'].includes(e.code)) {
      throw new AppError(409, 'SLOT_TAKEN', 'Slot taken');
    }
    throw e;
  }
}

export async function listAppointments(userId: string, status?: string) {
  const where: Prisma.AppointmentWhereInput = { customerId: userId };
  if (status === 'upcoming') {
    where.status = { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] };
    where.startTime = { gte: new Date() };
  } else if (status === 'past') {
    where.status = AppointmentStatus.COMPLETED;
  } else if (status === 'cancelled') {
    where.status = AppointmentStatus.CANCELLED;
  }
  return prisma.appointment.findMany({
    where,
    include: {
      salon: { include: { place: true } },
      staff: true,
      services: { include: { service: true } },
      review: true,
    },
    orderBy: { startTime: 'desc' },
  });
}

export async function getAppointment(userId: string, id: string, role: string) {
  const appt = assertFound(
    await prisma.appointment.findUnique({
      where: { id },
      include: {
        salon: { include: { place: true } },
        staff: true,
        services: { include: { service: true } },
        customer: true,
        review: true,
        payment: true,
      },
    }),
  );
  if (role === 'CUSTOMER' && appt.customerId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'Not your booking');
  }
  return appt;
}

export async function cancelAppointment(userId: string, id: string, raw: unknown) {
  cancelAppointmentSchema.parse(raw ?? {});
  const appt = await getAppointment(userId, id, 'CUSTOMER');
  if (![AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED].includes(appt.status)) {
    throw new AppError(400, 'INVALID_STATUS', 'Cannot cancel this booking');
  }
  const cutoffMs = appt.salon.cancelCutoffHours * 60 * 60 * 1000;
  if (appt.startTime.getTime() - Date.now() < cutoffMs) {
    throw new AppError(400, 'CUTOFF', `Cancel at least ${appt.salon.cancelCutoffHours}h before`);
  }
  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: AppointmentStatus.CANCELLED },
    include: { salon: { include: { place: true } }, staff: true, services: { include: { service: true } } },
  });

  if (appt.paymentStatus === PaymentStatus.PAID && appt.payment) {
    await refundPaymentForCancellation(appt.payment);
  }

  const waitlist = await prisma.waitlist.findMany({
    where: { salonId: appt.salonId, date: appt.date, notifiedAt: null },
    take: 5,
  });
  for (const w of waitlist) {
    await notifyUser(w.userId, {
      title: 'Slot opened',
      body: `A slot opened at ${appt.salon.place.name} on your waitlisted day.`,
      data: { type: 'waitlist_opened', salonId: appt.salonId },
    });
    await prisma.waitlist.update({ where: { id: w.id }, data: { notifiedAt: new Date() } });
  }

  await notifyUser(userId, {
    title: 'Booking cancelled',
    body: `Booking ${appt.bookingCode} was cancelled.`,
    data: { type: 'booking_cancelled', appointmentId: id },
  });
  return appt.paymentStatus === PaymentStatus.PAID
    ? prisma.appointment.findUniqueOrThrow({ where: { id }, include: { salon: { include: { place: true } }, staff: true, services: { include: { service: true } }, payment: true } })
    : updated;
}

export async function rescheduleAppointment(userId: string, id: string, raw: unknown) {
  const input = rescheduleSchema.parse(raw);
  const appt = await getAppointment(userId, id, 'CUSTOMER');
  if (![AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED].includes(appt.status)) {
    throw new AppError(400, 'INVALID_STATUS', 'Cannot reschedule');
  }
  const cutoffMs = appt.salon.cancelCutoffHours * 60 * 60 * 1000;
  if (appt.startTime.getTime() - Date.now() < cutoffMs) {
    throw new AppError(400, 'CUTOFF', 'Too close to appointment time');
  }
  const serviceIds = appt.services.map((s) => s.serviceId);
  const duration = appt.services.reduce((s, x) => s + x.durationMin, 0);
  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      const slotInfo = await getSalonSlotsWithClient(tx, {
        salonId: appt.salonId,
        date: input.date,
        serviceIds,
        staffId: input.staffId ?? 'any',
        excludeAppointmentId: id,
      });
      const slot = slotInfo.slots.find((candidate) => candidate.time === input.startTime && candidate.available);
      if (!slot?.staffIds.length) throw new AppError(409, 'SLOT_TAKEN', 'Slot unavailable');
      if (input.staffId && !slot.staffIds.includes(input.staffId)) {
        throw new AppError(409, 'STAFF_UNAVAILABLE', 'Selected stylist is not available for this slot');
      }
      const staffId = input.staffId ?? slot.staffIds[0];
      const startTime = combineDateAndTime(input.date, input.startTime);
      const endMin = parseHm(input.startTime) + duration;
      if (endMin > 24 * 60) throw new AppError(400, 'INVALID_SLOT', 'Appointment cannot continue past midnight');
      const endHm = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
      const endTime = combineDateAndTime(input.date, endHm);

      const conflict = await tx.appointment.findFirst({
        where: {
          staffId,
          id: { not: id },
          status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });
      if (conflict) throw new AppError(409, 'SLOT_TAKEN', 'Slot taken');
      return tx.appointment.update({
        where: { id },
        data: { date: new Date(input.date), startTime, endTime, staffId },
        include: { salon: { include: { place: true } }, staff: true, services: { include: { service: true } } },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2004', 'P2034'].includes(error.code)) {
      throw new AppError(409, 'SLOT_TAKEN', 'Slot taken');
    }
    throw error;
  }

  await notifyUser(userId, {
    title: 'Booking rescheduled',
    body: `Booking ${appt.bookingCode} moved to ${input.date} ${input.startTime}.`,
    data: { type: 'booking_rescheduled', appointmentId: id },
  });
  return updated;
}
