import { Router } from 'express';
import { locationSchema } from '@salonslot/shared';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import { assertFound } from '../../lib/errors';

export const meRouter = Router();

meRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const user = assertFound(
      await prisma.user.findUnique({ where: { id: req.user!.id } }),
    );
    res.json(user);
  } catch (e) {
    next(e);
  }
});

meRouter.patch('/', requireAuth, async (req, res, next) => {
  try {
    const body = z
      .object({
        name: z.string().min(1).max(80).optional(),
        email: z.string().email().optional(),
        avatarUrl: z.string().url().optional(),
        notifyPush: z.boolean().optional(),
        notifySms: z.boolean().optional(),
      })
      .parse(req.body);
    const user = await prisma.user.update({ where: { id: req.user!.id }, data: body });
    res.json(user);
  } catch (e) {
    next(e);
  }
});

meRouter.put('/location', requireAuth, async (req, res, next) => {
  try {
    const body = locationSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { city: body.city, lat: body.lat, lng: body.lng },
    });
    res.json(user);
  } catch (e) {
    next(e);
  }
});
