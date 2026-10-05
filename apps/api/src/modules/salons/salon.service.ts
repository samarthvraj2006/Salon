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
    },
  });

  let rows = withDistance(places, q.lat, q.lng);

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

  switch (q.sort) {
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
        services: { where: { isActive: true }, include: { category: true } },
        staff: { where: { isActive: true }, include: { services: true } },
        reviews: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
    }),
  );
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
