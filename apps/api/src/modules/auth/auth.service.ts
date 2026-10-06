import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { firebaseAuthSchema, refreshSchema } from '@salonslot/shared';
import { env } from '../../config/env';
import { AppError } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { signAccessToken, signRefreshToken } from '../../middleware/auth';
import { verifyFirebaseIdToken } from './firebase';

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function exchangeFirebaseToken(input: unknown) {
  const body = firebaseAuthSchema.parse(input);
  let uid: string;
  let phone: string | undefined;
  let email: string | undefined;
  let name: string | undefined;
  let phoneVerified = false;
  let emailVerified = false;

  if (env.AUTH_MODE === 'mock') {
    // Mock format: mock:<phone>:<otp>:<name>. Non-phone demo identities are for
    // local provider previews only; production mode never accepts this format.
    const parts = body.idToken.split(':');
    if (parts[0] !== 'mock' || !parts[1]) {
      throw new AppError(401, 'INVALID_TOKEN', 'Invalid mock token. Use mock:<phone>');
    }
    const identity = parts[1];
    if (/^[6-9]\d{9}$/.test(identity)) {
      if (parts[2] !== '123456') {
        throw new AppError(401, 'INVALID_OTP', 'In demo mode use OTP 123456');
      }
      phone = identity;
      phoneVerified = true;
      uid = `mock-phone-${identity}`;
    } else {
      email = identity;
      emailVerified = true;
      uid = `mock-email-${identity}`;
    }
    name = body.name ?? (phone ? parts.slice(3).join(':') : parts[2]) ?? 'Demo User';
  } else {
    const decoded = await verifyFirebaseIdToken(body.idToken);
    uid = decoded.uid;
    phone = decoded.phone_number?.replace('+91', '');
    email = decoded.email;
    name = body.name ?? decoded.name;
    phoneVerified = Boolean(decoded.phone_number);
    emailVerified = Boolean(decoded.email_verified);
  }

  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { firebaseUid: uid },
        ...(phone ? [{ phone }] : []),
        ...(email ? [{ email }] : []),
      ],
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        firebaseUid: uid,
        phone,
        email,
        name: name ?? 'SalonSlot User',
        role: Role.CUSTOMER,
        phoneVerified,
        emailVerified,
      },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        firebaseUid: user.firebaseUid ?? uid,
        phone: user.phone ?? phone,
        email: user.email ?? email,
        name: user.name ?? name,
        phoneVerified: user.phoneVerified || phoneVerified,
        emailVerified: user.emailVerified || emailVerified,
      },
    });
  }

  const authUser = { id: user.id, role: user.role };
  const accessToken = signAccessToken(authUser);
  const jti = crypto.randomUUID();
  const refreshToken = signRefreshToken(authUser, jti);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: await bcrypt.hash(hashToken(refreshToken), 10),
      expiresAt,
    },
  });

  return { accessToken, refreshToken, user };
}

export async function refreshTokens(input: unknown) {
  const { refreshToken } = refreshSchema.parse(input);
  let payload: { id: string; role: Role; jti?: string };
  try {
    const jwt = await import('jsonwebtoken');
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as typeof payload;
  } catch {
    throw new AppError(401, 'INVALID_REFRESH', 'Invalid refresh token');
  }

  const tokens = await prisma.refreshToken.findMany({
    where: { userId: payload.id, revokedAt: null, expiresAt: { gt: new Date() } },
  });
  const hashed = hashToken(refreshToken);
  let matched = false;
  for (const t of tokens) {
    if (await bcrypt.compare(hashed, t.tokenHash)) {
      matched = true;
      await prisma.refreshToken.update({
        where: { id: t.id },
        data: { revokedAt: new Date() },
      });
      break;
    }
  }
  if (!matched) throw new AppError(401, 'INVALID_REFRESH', 'Refresh token revoked or unknown');

  const user = await prisma.user.findUniqueOrThrow({ where: { id: payload.id } });
  const authUser = { id: user.id, role: user.role };
  const accessToken = signAccessToken(authUser);
  const newRefresh = signRefreshToken(authUser, crypto.randomUUID());
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: await bcrypt.hash(hashToken(newRefresh), 10),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  return { accessToken, refreshToken: newRefresh, user };
}

export async function logout(userId: string, refreshToken?: string) {
  if (refreshToken) {
    const tokens = await prisma.refreshToken.findMany({
      where: { userId, revokedAt: null },
    });
    const hashed = hashToken(refreshToken);
    for (const t of tokens) {
      if (await bcrypt.compare(hashed, t.tokenHash)) {
        await prisma.refreshToken.update({
          where: { id: t.id },
          data: { revokedAt: new Date() },
        });
      }
    }
  } else {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
