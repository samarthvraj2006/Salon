import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import cron from 'node-cron';
import { randomUUID } from 'crypto';
import { env } from './config/env';
import { logger } from './lib/logger';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './modules/auth/auth.routes';
import { meRouter } from './modules/users/me.routes';
import { v1Router } from './routes/v1';
import { prisma } from './lib/prisma';
import { notifyUser } from './modules/notifications/notify.service';
import { openApiSpec } from './openapi';

export function createApp() {
  const app = express();
  app.use((req, _res, next) => {
    req.requestId = randomUUID();
    next();
  });
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.requestId ?? randomUUID(),
    }),
  );
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGINS === '*' ? true : env.CORS_ORIGINS.split(',').map((s) => s.trim()),
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(
    rateLimit({
      windowMs: 60_000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'salonslot-api' }));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/me', meRouter);
  app.use('/api/v1', v1Router);
  app.use(errorHandler);
  return app;
}

export function startReminderJobs() {
  cron.schedule('*/15 * * * *', async () => {
    const now = Date.now();
    const in24h = new Date(now + 24 * 60 * 60 * 1000);
    const in30m = new Date(now + 30 * 60 * 1000);
    const window = 15 * 60 * 1000;
    const upcoming24 = await prisma.appointment.findMany({
      where: {
        status: 'CONFIRMED',
        startTime: { gte: new Date(in24h.getTime() - window), lte: in24h },
      },
      include: { salon: { include: { place: true } } },
    });
    for (const a of upcoming24) {
      await notifyUser(a.customerId, {
        title: 'Appointment tomorrow',
        body: `Your salon appointment is tomorrow at ${a.salon.place.name}.`,
        data: { appointmentId: a.id, type: 'reminder_24h' },
      });
    }
    const upcoming30 = await prisma.appointment.findMany({
      where: {
        status: 'CONFIRMED',
        startTime: { gte: new Date(in30m.getTime() - window), lte: in30m },
      },
      include: { salon: { include: { place: true } } },
    });
    for (const a of upcoming30) {
      await notifyUser(a.customerId, {
        title: 'Starting soon',
        body: `Your appointment at ${a.salon.place.name} starts in 30 minutes.`,
        data: { appointmentId: a.id, type: 'reminder_30m' },
      });
    }
  });
}
