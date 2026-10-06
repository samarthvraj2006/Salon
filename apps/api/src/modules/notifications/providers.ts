import { logger } from '../../lib/logger';
import admin from 'firebase-admin';
import { env } from '../../config/env';
import { AppError } from '../../lib/errors';

export interface NotificationProvider {
  send(
    channel: 'push' | 'sms' | 'whatsapp' | 'log',
    to: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void>;
}

export class LogProvider implements NotificationProvider {
  async send(channel: string, to: string, title: string, body: string, data?: Record<string, unknown>) {
    logger.info({ channel, to, title, body, data }, 'notification');
  }
}

export class FcmProvider implements NotificationProvider {
  private app() {
    const existing = admin.apps.find((app) => app?.name === 'salonslot-fcm');
    if (existing) return existing;
    if (!env.FCM_SERVER_CREDENTIALS) {
      throw new AppError(503, 'FCM_NOT_CONFIGURED', 'FCM server credentials are not configured');
    }
    let credential: Record<string, unknown>;
    try {
      credential = JSON.parse(env.FCM_SERVER_CREDENTIALS);
    } catch {
      throw new AppError(500, 'FCM_CONFIGURATION_INVALID', 'FCM_SERVER_CREDENTIALS must contain service-account JSON');
    }
    return admin.initializeApp({
      credential: admin.credential.cert(credential as admin.ServiceAccount),
    }, 'salonslot-fcm');
  }

  async send(_channel: string, to: string, title: string, body: string, data?: Record<string, unknown>) {
    const safeData = Object.fromEntries(
      Object.entries(data ?? {}).map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)]),
    );
    try {
      await this.app().messaging().send({ token: to, notification: { title, body }, data: safeData });
    } catch (err) {
      logger.warn({ err }, 'FCM delivery failed');
      throw err;
    }
  }
}

export class SmsProvider implements NotificationProvider {
  async send() {
    /* reserved */
  }
}

export class WhatsAppProvider implements NotificationProvider {
  async send() {
    /* reserved */
  }
}

export function getNotificationProvider(): NotificationProvider {
  return env.FCM_SERVER_CREDENTIALS ? new FcmProvider() : new LogProvider();
}
