import { haversineKm, salonQuerySchema } from '@salonslot/shared';
import { prisma } from '../../lib/prisma';
import { assertFound } from '../../lib/errors';
import { getSalonSlots } from '../slots/slot.service';

function withDistance<T extends { place: { lat: number; lng: number } }>(
  items: T[],
  lat?: number,
  lng?: number,
) {
  return items.map((item) => ({
    ...item,
    distanceKm:
      lat != null && lng != null
        ? Number(haversineKm(lat, lng, item.place.lat, item.place.lng).toFixed(2))
        : null,
  }));
}

export async function listSalons(rawQuery: unknown) {
  const q = salonQuerySchema.parse(rawQuery);
  const places = await prisma.salon.findMany({
    include: {
      place: true,
      services: { where: { isActive: true }, orderBy: { priceInr: 'asc' }, take: 1 },
      workingHours: true,
    },
  });

  let rows = withDistance(places, q.lat, q.lng).map((row) => ({
    ...row,
    place: { ...row.place, isOpen: isOpenAt(row.workingHours) },
    nextAvailable: null as string | null,
    nextAvailableSortKey: '9999-99-99 99:99',
  }));

  if (q.city) rows = rows.filter((r) => r.place.city.toLowerCase() === q.city!.toLowerCase());
  if (q.q) {
    const s = q.q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.place.name.toLowerCase().includes(s) ||
        r.place.address.toLowerCase().includes(s),
    );
  }
  if (q.minRating != null) rows = rows.filter((r) => r.place.rating >= q.minRating!);
  if (q.maxPrice != null) {
    rows = rows.filter((r) => (r.services[0]?.priceInr ?? 0) <= q.maxPrice!);
  }
  if (q.openNow) rows = rows.filter((r) => r.place.isOpen);
  if (q.category) {
    const matched = await prisma.service.findMany({
      where: { category: { name: q.category }, isActive: true },
      select: { salonId: true },
    });
    const ids = new Set(matched.map((m) => m.salonId));
    rows = rows.filter((r) => ids.has(r.id));
  }

  if (q.availableToday || q.sort === 'earliest') {
    const today = istDate();
    const withSlots = await Promise.all(rows.map(async (row) => {
      const serviceId = row.services[0]?.id;
      if (!serviceId) return { ...row, nextAvailable: null as string | null, nextAvailableSortKey: '9999-99-99 99:99' };
      const horizon = q.availableToday ? 1 : 7;
      for (let offset = 0; offset < horizon; offset++) {
        const date = addDays(today, offset);
        const slots = await getSalonSlots({ salonId: row.id, date, serviceIds: [serviceId], staffId: 'any' });
        if (slots.nextAvailable) {
          const label = offset === 0 ? slots.nextAvailable : `${date} · ${slots.nextAvailable}`;
          return { ...row, nextAvailable: label, nextAvailableSortKey: `${date} ${slots.nextAvailable}` };
        }
      }
      return { ...row, nextAvailable: null as string | null, nextAvailableSortKey: '9999-99-99 99:99' };
    }));
    rows = q.availableToday ? withSlots.filter((row) => row.nextAvailable != null) : withSlots;
    if (q.sort === 'earliest') {
      rows.sort((a, b) => {
        return a.nextAvailableSortKey.localeCompare(b.nextAvailableSortKey);
      });
    }
  }

  if (q.sort !== 'earliest') switch (q.sort) {
    case 'rating':
      rows.sort((a, b) => b.place.rating - a.place.rating);
      break;
    case 'price':
      rows.sort((a, b) => (a.services[0]?.priceInr ?? 0) - (b.services[0]?.priceInr ?? 0));
      break;
    case 'nearest':
    default:
      rows.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }

  const start = (q.page - 1) * q.pageSize;
  const page = rows.slice(start, start + q.pageSize);
  return { items: page, total: rows.length, page: q.page, pageSize: q.pageSize };
}

export async function getSalon(id: string, lat?: number, lng?: number) {
  const salon = assertFound(
    await prisma.salon.findUnique({
      where: { id },
      include: {
        place: true,
        workingHours: true,
        services: { where: { isActive: true }, include: { category: true }, orderBy: { priceInr: 'asc' } },
        staff: { where: { isActive: true }, include: { services: true } },
        reviews: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
    }),
  );
  salon.place.isOpen = isOpenAt(salon.workingHours);
  const [withDist] = withDistance([salon], lat, lng);
  const today = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
  const primary = salon.services[0];
  let nextAvailable: string | null = null;
  if (primary) {
    const slots = await getSalonSlots({
      salonId: id,
      date: today,
      serviceIds: [primary.id],
      staffId: 'any',
    });
    nextAvailable = slots.nextAvailable;
  }
  return { ...withDist, nextAvailable };
}

function istDate() {
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function isOpenAt(hours: Array<{ dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }>) {
  const shifted = new Date(Date.now() + 330 * 60_000);
  const row = hours.find((item) => item.dayOfWeek === shifted.getUTCDay());
  if (!row || row.isClosed) return false;
  const current = shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
  const [openHour, openMinute] = row.openTime.split(':').map(Number);
  const [closeHour, closeMinute] = row.closeTime.split(':').map(Number);
  return current >= openHour * 60 + openMinute && current < closeHour * 60 + closeMinute;
}

export async function listPlacesNearby(query: {
  lat: number;
  lng: number;
  type?: string;
  north?: number;
  south?: number;
  east?: number;
  west?: number;
}) {
  const places = await prisma.place.findMany({
    include: { salon: { include: { services: { orderBy: { priceInr: 'asc' }, take: 1 } } } },
  });
  let rows = places.map((p) => ({
    ...p,
    distanceKm: Number(haversineKm(query.lat, query.lng, p.lat, p.lng).toFixed(2)),
  }));
  if (query.type && query.type !== 'All') {
    rows = rows.filter((p) => p.type === query.type);
  }
  if (query.north != null && query.south != null && query.east != null && query.west != null) {
    rows = rows.filter(
      (p) =>
        p.lat <= query.north! &&
        p.lat >= query.south! &&
        p.lng <= query.east! &&
        p.lng >= query.west!,
    );
  }
  rows.sort((a, b) => a.distanceKm - b.distanceKm);
  return rows;
}
