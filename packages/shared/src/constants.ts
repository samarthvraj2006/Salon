export const CITIES = [
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Mumbai',
  'Pune',
  'Delhi',
  'Bhubaneswar',
] as const;

export const CATEGORIES = [
  'Haircut',
  'Hair Styling',
  'Beard',
  'Shaving',
  'Facial',
  'Hair Spa',
  'Manicure',
  'Pedicure',
  'Bridal',
  'Makeup',
  'Kids Haircut',
  'Other',
] as const;

export const ROLES = ['CUSTOMER', 'SALON_OWNER', 'SALON_STAFF', 'ADMIN'] as const;
export const PLACE_TYPES = ['SALON', 'PHARMACY', 'GROCERY', 'FOOD', 'OTHER'] as const;
export const APPOINTMENT_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
] as const;
export const PAYMENT_STATUSES = [
  'PENDING',
  'PAID',
  'FAILED',
  'REFUNDED',
  'PAY_AT_SALON',
] as const;

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
