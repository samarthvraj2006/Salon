import { Router } from 'express';
import {
  deviceRegisterSchema,
  reviewSchema,
  slotsQuerySchema,
  waitlistSchema,
} from '@salonslot/shared';
import { z } from 'zod';
import { optionalAuth, requireAuth, requireRoles } from '../../middleware/auth';
import { AppError } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { featureEnabled } from '../../config/env';
import * as salonService from '../salons/salon.service';
import * as appointmentService from '../appointments/appointment.service';
import * as promoService from '../promotions/promo.service';
import * as paymentService from '../payments/payment.service';
import * as homeService from '../home/home.service';
import { getSalonSlots } from '../slots/slot.service';
import { getPaymentProvider } from '../payments/providers';

export const v1Router = Router();

v1Router.get('/home/feed', optionalAuth, async (req, res, next) => {
  try {
    const lat = req.query.lat ? Number(req.query.lat) : req.user ? undefined : undefined;
    const lng = req.query.lng ? Number(req.query.lng) : undefined;
    const city = typeof req.query.city === 'string' ? req.query.city : undefined;
    let userLat = lat;
    let userLng = lng;
    let userCity = city;
    if (req.user) {
      const u = await prisma.user.findUnique({ where: { id: req.user.id } });
      userLat = lat ?? u?.lat ?? undefined;
      userLng = lng ?? u?.lng ?? undefined;
      userCity = city ?? u?.city ?? undefined;
    }
    res.json({
      cards: await homeService.getHomeFeed(req.user?.id, userLat, userLng, userCity),
    });
  } catch (e) {
    next(e);
  }
});

v1Router.get('/categories', async (_req, res, next) => {
  try {
    res.json(await prisma.category.findMany({ orderBy: { name: 'asc' } }));
  } catch (e) {
    next(e);
  }
});

v1Router.get('/salons', async (req, res, next) => {
  try {
    res.json(await salonService.listSalons(req.query));
  } catch (e) {
    next(e);
  }
});

v1Router.get('/salons/:id', async (req, res, next) => {
  try {
    const lat = req.query.lat ? Number(req.query.lat) : undefined;
    const lng = req.query.lng ? Number(req.query.lng) : undefined;
    res.json(await salonService.getSalon(req.params.id, lat, lng));
  } catch (e) {
    next(e);
  }
});

v1Router.get('/salons/:id/services', async (req, res, next) => {
  try {
    res.json(
      await prisma.service.findMany({
        where: { salonId: req.params.id, isActive: true },
        include: { category: true },
        orderBy: { priceInr: 'asc' },
      }),
    );
  } catch (e) {
    next(e);
  }
});

v1Router.get('/salons/:id/staff', async (req, res, next) => {
  try {
    res.json(
      await prisma.salonStaff.findMany({
        where: { salonId: req.params.id, isActive: true },
        include: { services: true },
      }),
    );
  } catch (e) {
    next(e);
  }
});

v1Router.get('/salons/:id/slots', async (req, res, next) => {
  try {
    const q = slotsQuerySchema.parse(req.query);
    res.json(
      await getSalonSlots({
        salonId: req.params.id,
        date: q.date,
        serviceIds: q.serviceIds.split(',').filter(Boolean),
        staffId: q.staffId,
      }),
    );
  } catch (e) {
    next(e);
  }
});

v1Router.get('/salons/:id/reviews', async (req, res, next) => {
  try {
    res.json(
      await prisma.review.findMany({
        where: { salonId: req.params.id },
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    );
  } catch (e) {
    next(e);
  }
});

v1Router.post('/appointments', requireAuth, async (req, res, next) => {
  try {
    res.status(201).json(await appointmentService.createAppointment(req.user!.id, req.body));
  } catch (e) {
    next(e);
  }
});

v1Router.get('/appointments', requireAuth, async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json(await appointmentService.listAppointments(req.user!.id, status));
  } catch (e) {
    next(e);
  }
});

v1Router.get('/appointments/:id', requireAuth, async (req, res, next) => {
  try {
    res.json(await appointmentService.getAppointment(req.user!.id, req.params.id, req.user!.role));
  } catch (e) {
    next(e);
  }
});

v1Router.post('/appointments/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    res.json(await appointmentService.cancelAppointment(req.user!.id, req.params.id, req.body));
  } catch (e) {
    next(e);
  }
});

v1Router.post('/appointments/:id/reschedule', requireAuth, async (req, res, next) => {
  try {
    res.json(await appointmentService.rescheduleAppointment(req.user!.id, req.params.id, req.body));
  } catch (e) {
    next(e);
  }
});

v1Router.post(
  '/appointments/:id/verify-qr',
  requireAuth,
  requireRoles('SALON_OWNER', 'SALON_STAFF', 'ADMIN'),
  async (_req, res) => {
    res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Owner QR verify coming later' } });
  },
);

v1Router.post('/reviews', requireAuth, async (req, res, next) => {
  try {
    const body = reviewSchema.parse(req.body);
    const appt = await appointmentService.getAppointment(req.user!.id, body.appointmentId, 'CUSTOMER');
    if (appt.status !== 'COMPLETED') {
      throw new AppError(400, 'NOT_COMPLETED', 'Only completed bookings can be reviewed');
    }
    if (appt.review) throw new AppError(400, 'ALREADY_REVIEWED', 'Already reviewed');
    const review = await prisma.review.create({
      data: {
        appointmentId: appt.id,
        salonId: appt.salonId,
        userId: req.user!.id,
        rating: body.rating,
        comment: body.comment,
        verified: true,
      },
    });
    const agg = await prisma.review.aggregate({
      where: { salonId: appt.salonId },
      _avg: { rating: true },
      _count: true,
    });
    await prisma.place.update({
      where: { id: appt.salon.placeId },
      data: {
        rating: Number((agg._avg.rating ?? body.rating).toFixed(1)),
        reviewCount: agg._count,
      },
    });
    res.status(201).json(review);
  } catch (e) {
    next(e);
  }
});

v1Router.get('/favorites', requireAuth, async (req, res, next) => {
  try {
    const favs = await prisma.favorite.findMany({
      where: { userId: req.user!.id },
      include: { salon: { include: { place: true, services: { orderBy: { priceInr: 'asc' }, take: 1 } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(favs);
  } catch (e) {
    next(e);
  }
});

v1Router.post('/favorites', requireAuth, async (req, res, next) => {
  try {
    const { salonId } = z.object({ salonId: z.string().cuid() }).parse(req.body);
    const fav = await prisma.favorite.upsert({
      where: { userId_salonId: { userId: req.user!.id, salonId } },
      create: { userId: req.user!.id, salonId },
      update: {},
    });
    res.status(201).json(fav);
  } catch (e) {
    next(e);
  }
});

v1Router.delete('/favorites/:salonId', requireAuth, async (req, res, next) => {
  try {
    await prisma.favorite.delete({
      where: { userId_salonId: { userId: req.user!.id, salonId: req.params.salonId } },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

v1Router.post('/waitlist', requireAuth, async (req, res, next) => {
  try {
    const body = waitlistSchema.parse(req.body);
    const created = await prisma.waitlist.create({
      data: {
        userId: req.user!.id,
        salonId: body.salonId,
        serviceId: body.serviceIds[0],
        preferredStaffId: body.preferredStaffId,
        date: new Date(body.date),
      },
    });
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
});

v1Router.delete('/waitlist/:id', requireAuth, async (req, res, next) => {
  try {
    const row = await prisma.waitlist.findUnique({ where: { id: req.params.id } });
    if (!row || row.userId !== req.user!.id) throw new AppError(404, 'NOT_FOUND', 'Waitlist not found');
    await prisma.waitlist.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

v1Router.get('/notifications', requireAuth, async (req, res, next) => {
  try {
    res.json(
      await prisma.notification.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    );
  } catch (e) {
    next(e);
  }
});

v1Router.patch('/notifications/:id/read', requireAuth, async (req, res, next) => {
  try {
    const n = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!n || n.userId !== req.user!.id) throw new AppError(404, 'NOT_FOUND', 'Not found');
    res.json(await prisma.notification.update({ where: { id: n.id }, data: { readAt: new Date() } }));
  } catch (e) {
    next(e);
  }
});

v1Router.post('/devices/register', requireAuth, async (req, res, next) => {
  try {
    const body = deviceRegisterSchema.parse(req.body);
    const row = await prisma.deviceToken.upsert({
      where: { token: body.token },
      create: { userId: req.user!.id, token: body.token, platform: body.platform },
      update: { userId: req.user!.id, platform: body.platform },
    });
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
});

v1Router.get('/promotions', async (req, res, next) => {
  try {
    const city = typeof req.query.city === 'string' ? req.query.city : undefined;
    res.json(await promoService.listPromotions(city));
  } catch (e) {
    next(e);
  }
});

v1Router.post('/promotions/validate', requireAuth, async (req, res, next) => {
  try {
    res.json(await promoService.validatePromoRequest(req.user!.id, req.body));
  } catch (e) {
    next(e);
  }
});

v1Router.post('/promotions/apply', requireAuth, async (req, res, next) => {
  try {
    res.json(await promoService.validatePromoRequest(req.user!.id, req.body));
  } catch (e) {
    next(e);
  }
});

v1Router.get('/payments/methods', requireAuth, async (_req, res, next) => {
  try {
    res.json(await paymentService.listMethods());
  } catch (e) {
    next(e);
  }
});

v1Router.post('/payments/create-order', requireAuth, async (req, res, next) => {
  try {
    res.json(await paymentService.createOrder(req.user!.id, req.body));
  } catch (e) {
    next(e);
  }
});

v1Router.post('/payments/verify', requireAuth, async (req, res, next) => {
  try {
    res.json(await paymentService.verifyPayment(req.user!.id, req.body));
  } catch (e) {
    next(e);
  }
});

v1Router.post('/payments/webhook/:provider', async (req, res, next) => {
  try {
    const provider = getPaymentProvider();
    const event = await provider.handleWebhook(req.body, req.header('x-razorpay-signature') ?? undefined);
    res.json({ ok: true, event });
  } catch (e) {
    next(e);
  }
});

v1Router.post('/payments/:id/refund', requireAuth, async (req, res, next) => {
  try {
    res.json(await paymentService.refundPayment(req.user!.id, req.params.id));
  } catch (e) {
    next(e);
  }
});

v1Router.get('/payments/history', requireAuth, async (req, res, next) => {
  try {
    res.json(await paymentService.paymentHistory(req.user!.id));
  } catch (e) {
    next(e);
  }
});

v1Router.all('/payments/wallet/*', (_req, res) => {
  res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Saved wallets coming later' } });
});

v1Router.get('/places/nearby', async (req, res, next) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'lat/lng required');
    }
    res.json(
      await salonService.listPlacesNearby({
        lat,
        lng,
        type: typeof req.query.type === 'string' ? req.query.type : undefined,
        north: req.query.north ? Number(req.query.north) : undefined,
        south: req.query.south ? Number(req.query.south) : undefined,
        east: req.query.east ? Number(req.query.east) : undefined,
        west: req.query.west ? Number(req.query.west) : undefined,
      }),
    );
  } catch (e) {
    next(e);
  }
});

function reserved(flag: string) {
  return (_req: unknown, res: import('express').Response) => {
    if (!featureEnabled(flag)) {
      return res.status(501).json({
        error: { code: 'NOT_IMPLEMENTED', message: `${flag} is behind a feature flag` },
      });
    }
    return res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Coming soon' } });
  };
}

v1Router.all('/loyalty/*', reserved('loyalty'));
v1Router.all('/referrals/*', reserved('referrals'));
v1Router.all('/subscriptions/*', reserved('subscriptions'));
v1Router.all('/orders/*', reserved('orders'));
v1Router.all('/recommendations', reserved('recommendations'));
v1Router.all('/owner/*', requireAuth, requireRoles('SALON_OWNER', 'ADMIN'), (_req, res) => {
  res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Owner dashboard later' } });
});
v1Router.all('/admin/*', requireAuth, requireRoles('ADMIN'), (_req, res) => {
  res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Admin panel later' } });
});
