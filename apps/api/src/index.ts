import { createApp, startReminderJobs } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';

const app = createApp();
app.listen(env.API_PORT, () => {
  logger.info(`SalonSlot API on :${env.API_PORT} (auth=${env.AUTH_MODE}, pay=${env.PAYMENT_PROVIDER})`);
  startReminderJobs();
});
