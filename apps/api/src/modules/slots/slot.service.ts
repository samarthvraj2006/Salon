import { AppointmentStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
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
const IST_OFFSET_MIN = 330;

function istDateKey(date: Date) {
  return new Date(date.getTime() + IST_OFFSET_MIN * 60_000).toISOString().slice(0, 10);
}

function istMinuteOfDay(date: Date) {
  const shifted = new Date(date.getTime() + IST_OFFSET_MIN * 60_000);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

type SlotDb = Pick<Prisma.TransactionClient, 'salon'>;

export async function getSalonSlots(input: {
  salonId: string;
  date: string;
  serviceIds: string[];
  staffId?: string | 'any';
  excludeAppointmentId?: string;
}) {
  return getSalonSlotsWithClient(prisma, input);
}

export async function getSalonSlotsWithClient(db: SlotDb, input: {
  salonId: string;
  date: string;
  serviceIds: string[];
  staffId?: string | 'any';
  excludeAppointmentId?: string;
}) {
  const salon = assertFound(
    await db.salon.findUnique({
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
                id: input.excludeAppointmentId ? { not: input.excludeAppointmentId } : undefined,
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
  const [year, month, date] = input.date.split('-').map(Number);
  const day = new Date(Date.UTC(year, month - 1, date));
  if (day.toISOString().slice(0, 10) !== input.date) {
    throw new AppError(400, 'INVALID_DATE', 'Choose a valid calendar date');
  }
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
  const todayStr = istDateKey(now);
  const nowMin = todayStr === input.date ? istMinuteOfDay(now) + BUFFER_MIN : -1;

  const salonBlocks: Interval[] = salon.blockedSlots
    .filter((b) => istDateKey(b.startTime) === input.date && !b.staffId)
    .map((b) => ({
      start: istMinuteOfDay(b.startTime),
      end: istMinuteOfDay(b.endTime),
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
        start: istMinuteOfDay(a.startTime),
        end: istMinuteOfDay(a.endTime),
      }));
      const staffBlocks: Interval[] = salon.blockedSlots
        .filter((b) => b.staffId === st.id && istDateKey(b.startTime) === input.date)
        .map((b) => ({
          start: istMinuteOfDay(b.startTime),
          end: istMinuteOfDay(b.endTime),
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
