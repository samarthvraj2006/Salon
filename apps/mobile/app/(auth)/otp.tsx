import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { GlassCard, PrimaryButton, SecondaryButton } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { confirmPhoneCode, resendPhoneCode } from '../../src/lib/firebaseAuth';
import { registerForNotifications } from '../../src/lib/notifications';
import { useAuth } from '../../src/store/auth';
import { colors, space } from '../../src/theme';

const authMode = (Constants.expoConfig?.extra as any)?.authMode ?? 'mock';

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState('');
  const [seconds, setSeconds] = useState(30);
  const [attempts, setAttempts] = useState(0);
  const [resends, setResends] = useState(0);
  const [busy, setBusy] = useState(false);
  const setSession = useAuth((s) => s.setSession);
  const router = useRouter();

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  async function verify() {
    if (busy) return;
    if (!/^\d{6}$/.test(otp)) {
      Alert.alert('Enter the 6-digit code');
      return;
    }
    if (attempts >= 5) {
      Alert.alert('Try again later', 'You have reached the maximum number of code attempts.');
      return;
    }
    setBusy(true);
    try {
      if (authMode === 'mock' && otp !== '123456') {
        setAttempts((value) => value + 1);
        Alert.alert('Incorrect code', 'Use 123456 in demo mode.');
        return;
      }
      const idToken = authMode === 'mock' ? `mock:${phone}:${otp}:Demo Customer` : await confirmPhoneCode(otp);
      const data = await api<any>('/api/v1/auth/firebase', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ idToken, name: 'Demo Customer' }),
      });
      await setSession(data);
      registerForNotifications().catch(() => undefined);
      router.replace(data.user?.city ? '/(tabs)/home' : '/location');
    } catch (error: any) {
      setAttempts((value) => value + 1);
      Alert.alert('Could not verify code', error?.message ?? 'Check the code and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (seconds > 0 || resends >= 3 || busy) return;
    setBusy(true);
    try {
      if (authMode !== 'mock') await resendPhoneCode(phone ?? '');
      setResends((value) => value + 1);
      setSeconds(30);
      setOtp('');
    } catch (error: any) {
      Alert.alert('Could not resend code', error?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>PHONE VERIFICATION</Text>
      <Text style={styles.title}>Check your messages</Text>
      <Text style={styles.sub}>Enter the 6-digit code sent to +91 {phone}</Text>
      <GlassCard style={styles.card}>
        <TextInput
          accessibilityLabel="6-digit verification code"
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          maxLength={6}
          value={otp}
          onChangeText={(value) => setOtp(value.replace(/\D/g, '').slice(0, 6))}
          onSubmitEditing={verify}
          style={styles.input}
          placeholder="••••••"
          placeholderTextColor="#9CA3AF"
          autoFocus
        />
        <PrimaryButton title="Verify and continue" onPress={verify} loading={busy} />
        <View style={styles.resendRow}>
          <Text style={styles.resendText}>{seconds > 0 ? `Resend code in ${seconds}s` : 'Didn’t get a code?'}</Text>
          <Text
            accessibilityRole="button"
            onPress={resend}
            style={[styles.resendLink, (seconds > 0 || resends >= 3 || busy) && styles.resendDisabled]}
          >
            {resends >= 3 ? 'Limit reached' : 'Resend'}
          </Text>
        </View>
      </GlassCard>
      {authMode === 'mock' ? <Text style={styles.demo}>Demo verification code: 123456</Text> : null}
      <View style={{ height: 12 }} />
      <SecondaryButton title="Change phone number" onPress={() => router.back()} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: space.xl, justifyContent: 'center', backgroundColor: colors.bgSoft },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginBottom: 10 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  sub: { color: colors.textSecondary, marginTop: 8, marginBottom: 22, lineHeight: 22 },
  card: { backgroundColor: 'rgba(255,255,255,0.82)' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, minHeight: 58, paddingHorizontal: 14, marginBottom: 14, letterSpacing: 12, fontSize: 24, textAlign: 'center', backgroundColor: '#fff', color: colors.text },
  resendRow: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 16, flexWrap: 'wrap' },
  resendText: { color: colors.textSecondary },
  resendLink: { color: colors.primary, fontWeight: '700' },
  resendDisabled: { color: colors.textDisabled },
  demo: { color: colors.textSecondary, textAlign: 'center', marginVertical: 14, fontSize: 13 },
});
