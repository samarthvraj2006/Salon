import { AppointmentStatus } from '@prisma/client';
import type { HomeFeedCard } from '@salonslot/shared';
import { prisma } from '../../lib/prisma';
import { listSalons } from '../salons/salon.service';
import { listPromotions } from '../promotions/promo.service';
import { getSalonSlots } from '../slots/slot.service';

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function getHomeFeed(userId?: string, lat?: number, lng?: number, city?: string) {
  const cards: HomeFeedCard[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const seedBase =
    (userId ? [...userId].reduce((s, c) => s + c.charCodeAt(0), 0) : 42) +
    Number(today.replace(/-/g, ''));

  if (userId) {
    const next = await prisma.appointment.findFirst({
      where: {
        customerId: userId,
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
        startTime: { gte: new Date() },
      },
      include: {
        salon: { include: { place: true } },
        services: { include: { service: true } },
      },
      orderBy: { startTime: 'asc' },
    });
    if (next) {
      cards.push({
        type: 'NextAppointmentCard',
        id: `next-${next.id}`,
        payload: next as unknown as Record<string, unknown>,
      });
    }
  }

  cards.push({
    type: 'HeroCard',
    id: 'hero',
    payload: {
      title: 'Your Salon. Your Time. No Waiting.',
      cta: 'Find a Salon',
    },
  });

  const rest: HomeFeedCard[] = [];
  const promos = await listPromotions(city);
  if (promos.length) {
    rest.push({
      type: 'PromoBannerCarousel',
      id: 'promos',
      payload: { items: promos },
    });
  }
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  rest.push({ type: 'CategoryGrid', id: 'categories', payload: { items: categories } });

  const nearby = await listSalons({ lat, lng, city, page: 1, pageSize: 8, sort: 'nearest' });
  rest.push({
    type: 'NearbySalonsCarousel',
    id: 'nearby',
    payload: { items: nearby.items },
  });

  const offer = promos.find((p) => p.code);
  if (offer) {
    rest.push({ type: 'OfferCard', id: `offer-${offer.id}`, payload: offer as unknown as Record<string, unknown> });
  }

  const trending = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { priceInr: 'asc' },
    take: 5,
    include: { salon: { include: { place: true } } },
  });
  if (trending[0]) {
    rest.push({
      type: 'TrendingServiceCard',
      id: 'trending',
      payload: {
        title: `${trending[0].name} · from ₹${trending[0].priceInr}`,
        items: trending,
      },
    });
  }

  const topRated = [...nearby.items].sort(
    (a, b) => b.place.rating - a.place.rating,
  )[0];
  if (topRated) {
    rest.push({
      type: 'TopRatedSalonCard',
      id: `top-${topRated.id}`,
      payload: topRated as unknown as Record<string, unknown>,
    });
  }

  if (userId) {
    const past = await prisma.appointment.findFirst({
      where: { customerId: userId, status: AppointmentStatus.COMPLETED },
      include: { salon: { include: { place: true } } },
      orderBy: { startTime: 'desc' },
    });
    if (past) {
      rest.push({
        type: 'BookAgainCard',
        id: `again-${past.id}`,
        payload: past as unknown as Record<string, unknown>,
      });
    }
  }

  const newbie = await prisma.salon.findFirst({
    where: { isNew: true },
    include: { place: true },
  });
  if (newbie) {
    rest.push({
      type: 'NewOnSalonSlotCard',
      id: `new-${newbie.id}`,
      payload: newbie as unknown as Record<string, unknown>,
    });
  }

  if (nearby.items[0]?.services?.[0]) {
    const salon = nearby.items[0];
    const slots = await getSalonSlots({
      salonId: salon.id,
      date: today,
      serviceIds: [salon.services[0].id],
    });
    if (slots.nextAvailable) {
      rest.push({
        type: 'QuickSlotCard',
        id: 'quick-slot',
        payload: {
          time: slots.nextAvailable,
          salonName: salon.place.name,
          salonId: salon.id,
        },
      });
    }
  }

  rest.push({
    type: 'TipCard',
    id: 'tip',
    payload: {
      title: 'Grooming tip',
      body: 'Trim every 3–4 weeks to keep your style sharp between salon visits.',
    },
  });

  const shuffled = seededShuffle(rest, seedBase);
  const deduped: HomeFeedCard[] = [];
  for (const c of shuffled) {
    if (deduped.length && deduped[deduped.length - 1].type === c.type) continue;
    deduped.push(c);
  }

  return [...cards, ...deduped];
}
