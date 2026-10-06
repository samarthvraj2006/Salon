import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

let phoneConfirmation: FirebaseAuthTypes.ConfirmationResult | null = null;

export async function requestPhoneCode(phone: string) {
  const auth = require('@react-native-firebase/auth').default as typeof import('@react-native-firebase/auth').default;
  phoneConfirmation = await auth().signInWithPhoneNumber(`+91${phone}`);
}

export async function resendPhoneCode(phone: string) {
  await requestPhoneCode(phone);
}

export async function confirmPhoneCode(code: string) {
  if (!phoneConfirmation) throw new Error('Request a new verification code first.');
  const result = await phoneConfirmation.confirm(code);
  if (!result) throw new Error('The verification code could not be confirmed.');
  return result.user.getIdToken();
}

export async function getGoogleFirebaseToken(idToken: string) {
  const auth = require('@react-native-firebase/auth').default as typeof import('@react-native-firebase/auth').default;
  const credential = auth.GoogleAuthProvider.credential(idToken);
  const result = await auth().signInWithCredential(credential);
  return result.user.getIdToken();
}

