import { promotionValidateSchema } from '@salonslot/shared';
import { AppError, assertFound } from '../../lib/errors';
import { prisma } from '../../lib/prisma';

export async function listPromotions(city?: string) {
  const now = new Date();
  return prisma.promotion.findMany({
    where: {
      isActive: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
      OR: city ? [{ city }, { city: null }] : undefined,
    },
    orderBy: { startsAt: 'desc' },
  });
}

export async function validateAndQuotePromo(input: {
  code: string;
  salonId: string;
  amount: number;
  userId: string;
}) {
  const promo = assertFound(
    await prisma.promotion.findFirst({
      where: {
        code: input.code.toUpperCase(),
        isActive: true,
        startsAt: { lte: new Date() },
        endsAt: { gte: new Date() },
      },
    }),
    'Invalid coupon',
  );
  if (promo.salonId && promo.salonId !== input.salonId) {
    throw new AppError(400, 'COUPON_SALON', 'Coupon not valid for this salon');
  }
  if (input.amount < promo.minAmount) {
    throw new AppError(400, 'COUPON_MIN', `Minimum amount ₹${promo.minAmount}`);
  }
  if (promo.usageLimit != null && promo.usedCount >= promo.usageLimit) {
    throw new AppError(400, 'COUPON_EXHAUSTED', 'Coupon usage limit reached');
  }
  if (promo.firstBookingOnly) {
    const prior = await prisma.appointment.count({
      where: { customerId: input.userId, status: { not: 'CANCELLED' } },
    });
    if (prior > 0) throw new AppError(400, 'COUPON_FIRST_ONLY', 'First booking only');
  }
  let discount = 0;
  if (promo.type === 'FLAT' || promo.type === 'FIRST_BOOKING') {
    discount = promo.value;
  } else {
    discount = Math.floor((input.amount * promo.value) / 100);
    if (promo.maxDiscount != null) discount = Math.min(discount, promo.maxDiscount);
  }
  discount = Math.min(discount, input.amount);
  return { discount, promotionId: promo.id, title: promo.title };
}

export async function validatePromoRequest(userId: string, raw: unknown) {
  const body = promotionValidateSchema.parse(raw);
  return validateAndQuotePromo({ ...body, userId });
}
