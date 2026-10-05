import admin from 'firebase-admin';
import { env } from '../../config/env';
import { AppError } from '../../lib/errors';

let initialized = false;

function initFirebase() {
  if (initialized) return;
  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
    throw new AppError(500, 'FIREBASE_NOT_CONFIGURED', 'Firebase admin credentials missing');
  }
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
  initialized = true;
}

export async function verifyFirebaseIdToken(idToken: string) {
  initFirebase();
  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'Firebase ID token invalid');
  }
}
