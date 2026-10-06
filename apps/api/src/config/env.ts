import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  AUTH_MODE: z.enum(['mock', 'firebase']).default('mock'),
  PAYMENT_PROVIDER: z.enum(['mock', 'razorpay']).default('mock'),
  API_PORT: z.coerce.number().default(4000),
  API_BASE_URL: z.string().default('http://localhost:4000'),
  CORS_ORIGINS: z.string().default('*'),
  LOG_LEVEL: z.string().default('info'),
  FEATURE_FLAGS: z.string().default(''),
  FIREBASE_PROJECT_ID: z.string().optional().default(''),
  FIREBASE_CLIENT_EMAIL: z.string().optional().default(''),
  FIREBASE_PRIVATE_KEY: z.string().optional().default(''),
  GOOGLE_MAPS_API_KEY: z.string().optional().default(''),
  RAZORPAY_KEY_ID: z.string().optional().default(''),
  RAZORPAY_KEY_SECRET: z.string().optional().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(''),
  FCM_SERVER_CREDENTIALS: z.string().optional().default(''),
});

export const env = envSchema.parse(process.env);

export function featureEnabled(name: string): boolean {
  const map = Object.fromEntries(
    env.FEATURE_FLAGS.split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const [k, v] = p.split(':');
        return [k, v === 'true'];
      }),
  );
  return Boolean(map[name]);
}
