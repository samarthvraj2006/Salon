import { z } from 'zod';
import { APPOINTMENT_STATUSES, CITIES, PLACE_TYPES, ROLES } from './constants';

export const phoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');

export const firebaseAuthSchema = z.object({
  idToken: z.string().min(10),
  name: z.string().min(1).max(80).optional(),
  email: z.string().email().optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const locationSchema = z.object({
  city: z.enum(CITIES).or(z.string().min(2)),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const salonQuerySchema = z.object({
  q: z.string().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  category: z.string().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  maxPrice: z.coerce.number().optional(),
  openNow: z.coerce.boolean().optional(),
  availableToday: z.coerce.boolean().optional(),
  sort: z.enum(['nearest', 'rating', 'price', 'earliest']).optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(50).default(20),
  city: z.string().optional(),
  type: z.enum(PLACE_TYPES).optional(),
});

export const slotsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceIds: z.string().min(1),
  staffId: z.string().optional(),
});

export const createAppointmentSchema = z.object({
  salonId: z.string().cuid(),
  serviceIds: z.array(z.string().cuid()).min(1),
  staffId: z.string().cuid().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string(),
  paymentMethod: z.enum(['PAY_AT_SALON', 'ONLINE']).default('PAY_AT_SALON'),
  couponCode: z.string().optional(),
});

export const cancelAppointmentSchema = z.object({
  reason: z.string().max(300).optional(),
});

export const rescheduleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string(),
  staffId: z.string().cuid().optional().nullable(),
});

export const reviewSchema = z.object({
  appointmentId: z.string().cuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export const promotionValidateSchema = z.object({
  code: z.string().min(2),
  salonId: z.string().cuid(),
  amount: z.number().positive(),
});

export const createPaymentOrderSchema = z.object({
  appointmentId: z.string().cuid(),
  method: z.enum(['UPI', 'CARD', 'NETBANKING', 'WALLET']),
});

export const verifyPaymentSchema = z.object({
  paymentId: z.string().cuid(),
  providerOrderId: z.string(),
  providerPaymentId: z.string().optional(),
  status: z.enum(['success', 'failure', 'pending']).optional(),
});

export const waitlistSchema = z.object({
  salonId: z.string().cuid(),
  serviceIds: z.array(z.string().cuid()).min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  preferredStaffId: z.string().cuid().optional(),
});

export const deviceRegisterSchema = z.object({
  token: z.string().min(10),
  platform: z.enum(['android', 'ios', 'web']).default('android'),
});

export const roleSchema = z.enum(ROLES);
export const appointmentStatusSchema = z.enum(APPOINTMENT_STATUSES);

export type FirebaseAuthInput = z.infer<typeof firebaseAuthSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type SalonQuery = z.infer<typeof salonQuerySchema>;
