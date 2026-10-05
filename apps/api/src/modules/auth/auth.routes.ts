import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../../middleware/auth';
import * as authService from './auth.service';

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

authRouter.post('/firebase', authLimiter, async (req, res, next) => {
  try {
    const result = await authService.exchangeFirebaseToken(req.body);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

authRouter.post('/refresh', authLimiter, async (req, res, next) => {
  try {
    const result = await authService.refreshTokens(req.body);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

authRouter.post('/logout', requireAuth, async (req, res, next) => {
  try {
    await authService.logout(req.user!.id, req.body?.refreshToken);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
