import { logger } from '../../lib/logger';

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
  async send(_channel: string, to: string, title: string, body: string, data?: Record<string, unknown>) {
    // Wire firebase-admin messaging when FCM credentials exist
    logger.info({ to, title, body, data }, 'FCM stub send');
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
  return process.env.FCM_SERVER_CREDENTIALS ? new FcmProvider() : new LogProvider();
}
