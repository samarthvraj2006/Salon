import { AppointmentStatus } from '@prisma/client';
import { AppError, assertFound } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import {
  buildSlotTimes,
  combineDateAndTime,
  isBlocked,
  minutesToHm,
  parseHm,
  type Interval,
} from './slot.utils';

const BUFFER_MIN = 15;

export async function getSalonSlots(input: {
  salonId: string;
  date: string;
  serviceIds: string[];
  staffId?: string | 'any';
}) {
  const salon = assertFound(
    await prisma.salon.findUnique({
      where: { id: input.salonId },
      include: {
        workingHours: true,
        holidays: true,
        blockedSlots: true,
        staff: {
          where: { isActive: true },
          include: {
            services: true,
            availability: true,
            appointments: {
              where: {
                date: new Date(input.date),
                status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
              },
            },
          },
        },
        services: { where: { id: { in: input.serviceIds }, isActive: true } },
      },
    }),
    'Salon not found',
  );

  if (salon.services.length !== input.serviceIds.length) {
    throw new AppError(400, 'INVALID_SERVICES', 'One or more services invalid for salon');
  }

  const duration = salon.services.reduce((s, x) => s + x.durationMin, 0);
  const day = new Date(input.date);
  const dow = day.getUTCDay();

  if (salon.holidays.some((h) => h.date.toISOString().slice(0, 10) === input.date)) {
    return { slots: [], nextAvailable: null, durationMin: duration };
  }

  const hours = salon.workingHours.find((w) => w.dayOfWeek === dow);
  if (!hours || hours.isClosed) {
    return { slots: [], nextAvailable: null, durationMin: duration };
  }

  const openMin = parseHm(hours.openTime);
  const closeMin = parseHm(hours.closeTime);
  const grid = buildSlotTimes(openMin, closeMin, duration, salon.slotIntervalMin);

  const now = new Date();
  const todayStr = new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
  const nowMin =
    todayStr === input.date
      ? now.getUTCHours() * 60 + now.getUTCMinutes() + 330 + BUFFER_MIN
      : -1;

  const salonBlocks: Interval[] = salon.blockedSlots
    .filter((b) => b.startTime.toISOString().slice(0, 10) === input.date && !b.staffId)
    .map((b) => ({
      start: b.startTime.getUTCHours() * 60 + b.startTime.getUTCMinutes() + 330,
      end: b.endTime.getUTCHours() * 60 + b.endTime.getUTCMinutes() + 330,
    }));

  let candidates = salon.staff.filter((st) =>
    input.serviceIds.every((sid) => st.services.some((s) => s.serviceId === sid)),
  );

  if (input.staffId && input.staffId !== 'any') {
    candidates = candidates.filter((s) => s.id === input.staffId);
  }

  const slots = grid.map((startMin) => {
    const endMin = startMin + duration;
    const past = nowMin >= 0 && startMin < nowMin;
    const salonBlocked = isBlocked(startMin, endMin, salonBlocks);
    const staffIds: string[] = [];

    for (const st of candidates) {
      const avail = st.availability.find((a) => a.dayOfWeek === dow);
      if (!avail) continue;
      const stStart = parseHm(avail.startTime);
      const stEnd = parseHm(avail.endTime);
      if (startMin < stStart || endMin > stEnd) continue;
      if (avail.breakStart && avail.breakEnd) {
        if (isBlocked(startMin, endMin, [{ start: parseHm(avail.breakStart), end: parseHm(avail.breakEnd) }])) {
          continue;
        }
      }
      const apptBlocks: Interval[] = st.appointments.map((a) => ({
        start: a.startTime.getUTCHours() * 60 + a.startTime.getUTCMinutes() + 330,
        end: a.endTime.getUTCHours() * 60 + a.endTime.getUTCMinutes() + 330,
      }));
      const staffBlocks: Interval[] = salon.blockedSlots
        .filter((b) => b.staffId === st.id && b.startTime.toISOString().slice(0, 10) === input.date)
        .map((b) => ({
          start: b.startTime.getUTCHours() * 60 + b.startTime.getUTCMinutes() + 330,
          end: b.endTime.getUTCHours() * 60 + b.endTime.getUTCMinutes() + 330,
        }));
      if (isBlocked(startMin, endMin, [...apptBlocks, ...staffBlocks])) continue;
      staffIds.push(st.id);
    }

    const available = !past && !salonBlocked && staffIds.length > 0;
    return {
      time: minutesToHm(startMin),
      available,
      staffIds,
    };
  });

  const next = slots.find((s) => s.available)?.time ?? null;
  return { slots, nextAvailable: next, durationMin: duration };
}

export { combineDateAndTime };
