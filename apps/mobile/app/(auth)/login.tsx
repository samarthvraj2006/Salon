import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GlassCard, PrimaryButton, SecondaryButton } from '../../src/components/ui';
import { colors, space } from '../../src/theme';
import { api } from '../../src/lib/api';
import { requestPhoneCode, getGoogleFirebaseToken } from '../../src/lib/firebaseAuth';
import { registerForNotifications } from '../../src/lib/notifications';
import { useAuth } from '../../src/store/auth';

const extra = Constants.expoConfig?.extra as { authMode?: string; googleWebClientId?: string } | undefined;
const authMode = extra?.authMode ?? 'mock';

export default function Login() {
  const router = useRouter();
  const setSession = useAuth((s) => s.setSession);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  async function exchangeToken(idToken: string, name?: string) {
    const data = await api<any>('/api/v1/auth/firebase', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ idToken, name }),
    });
    await setSession(data);
    registerForNotifications().catch(() => undefined);
    router.replace(data.user?.city ? '/(tabs)/home' : '/location');
  }

  async function onPhoneContinue() {
    const normalizedPhone = phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
      Alert.alert('Check your number', 'Enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (authMode !== 'mock') {
      setLoading(true);
      try {
        await requestPhoneCode(normalizedPhone);
      } catch (error: any) {
        Alert.alert('Could not send code', error?.message ?? 'Check your connection and try again.');
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    router.push({ pathname: '/(auth)/otp', params: { phone: normalizedPhone } });
  }

  async function onGoogleContinue() {
    if (authMode === 'mock') {
      setLoading(true);
      try {
        await exchangeToken('mock:demo.google@salonslot.app:Google Demo', 'Google Demo');
      } catch (error: any) {
        Alert.alert('Sign-in failed', error?.message ?? 'Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      GoogleSignin.configure({ webClientId: extra?.googleWebClientId, offlineAccess: false });
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response: any = await GoogleSignin.signIn();
      const googleIdToken = response?.data?.idToken ?? response?.idToken;
      if (!googleIdToken) throw new Error('Google did not return an ID token. Check the web client ID configuration.');
      const firebaseIdToken = await getGoogleFirebaseToken(googleIdToken);
      await exchangeToken(firebaseIdToken, response?.data?.user?.name ?? response?.user?.name);
    } catch (error: any) {
      if (error?.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert('Google sign-in failed', error?.message ?? 'Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.brandMark}><Text style={styles.brandMarkText}>S</Text></View>
      <Text style={styles.brand}>SalonSlot</Text>
      <Text style={styles.sub}>Your next good hair day starts here.</Text>
      <GlassCard style={styles.card}>
        <Text style={styles.label}>Your mobile number</Text>
        <View style={styles.phoneField}>
          <Text style={styles.countryCode}>🇮🇳  +91</Text>
          <TextInput
            accessibilityLabel="Phone number"
            keyboardType="phone-pad"
            maxLength={10}
            value={phone}
            onChangeText={(value) => setPhone(value.replace(/\D/g, '').slice(0, 10))}
            style={styles.input}
            placeholder="10-digit mobile number"
            placeholderTextColor="#9CA3AF"
            returnKeyType="done"
            onSubmitEditing={onPhoneContinue}
          />
        </View>
        <PrimaryButton title="Continue with phone" onPress={onPhoneContinue} loading={loading} />
        <Text style={styles.finePrint}>
          {authMode === 'mock' ? 'Demo mode · use OTP 123456' : 'We’ll send a secure verification code to your number.'}
        </Text>
      </GlassCard>

      <View style={styles.divider}><View style={styles.rule} /><Text style={styles.or}>or</Text><View style={styles.rule} /></View>
      <SecondaryButton title="Continue with Google" onPress={onGoogleContinue} disabled={loading} />
      <Text style={styles.terms}>By continuing, you agree to SalonSlot’s Terms and Privacy Policy.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: space.xl, justifyContent: 'center', backgroundColor: colors.bgSoft },
  brandMark: { width: 56, height: 56, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  brandMarkText: { color: '#fff', fontWeight: '900', fontSize: 30 },
  brand: { fontSize: 32, fontWeight: '800', color: colors.text, letterSpacing: -0.6 },
  sub: { color: colors.textSecondary, marginBottom: 24, marginTop: 5, fontSize: 16 },
  card: { backgroundColor: 'rgba(255,255,255,0.82)' },
  label: { fontWeight: '700', marginBottom: 8, color: colors.text, fontSize: 14 },
  phoneField: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, minHeight: 54, paddingHorizontal: 12, marginBottom: 14, backgroundColor: '#fff' },
  countryCode: { color: colors.text, fontWeight: '700', fontSize: 15, marginRight: 10 },
  input: { flex: 1, minHeight: 52, fontSize: 16, color: colors.text },
  finePrint: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: 12 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  rule: { flex: 1, height: 1, backgroundColor: '#DDE5E0' },
  or: { color: colors.textSecondary, fontSize: 13 },
  terms: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 24 },
});
