import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { getNotificationProvider } from './providers';

export async function notifyUser(
  userId: string,
  input: { title: string; body: string; data?: Record<string, unknown> },
) {
  await prisma.notification.create({
    data: {
      userId,
      title: input.title,
      body: input.body,
      data: input.data ?? {},
    },
  });
  const tokens = await prisma.deviceToken.findMany({ where: { userId } });
  const provider = getNotificationProvider();
  for (const t of tokens) {
    try {
      await provider.send('push', t.token, input.title, input.body, input.data);
    } catch (err) {
      logger.warn({ err }, 'Push failed');
    }
  }
}
