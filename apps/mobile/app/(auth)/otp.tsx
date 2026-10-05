import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PrimaryButton, GlassCard } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/store/auth';
import { colors, space } from '../../src/theme';

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState('123456');
  const [seconds, setSeconds] = useState(30);
  const [retries, setRetries] = useState(0);
  const setSession = useAuth((s) => s.setSession);
  const router = useRouter();

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  async function verify() {
    if (otp !== '123456') {
      Alert.alert('Invalid OTP', 'In mock mode use 123456');
      return;
    }
    if (retries >= 5) {
      Alert.alert('Too many retries');
      return;
    }
    try {
      const data = await api<any>('/api/v1/auth/firebase', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ idToken: `mock:${phone}`, name: 'Demo Customer' }),
      });
      await setSession(data);
      router.replace(data.user?.city ? '/(tabs)/home' : '/location');
    } catch (e: any) {
      setRetries((r) => r + 1);
      Alert.alert('OTP failed', e.message);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.sub}>Sent to +91 {phone}</Text>
      <GlassCard>
        <TextInput
          accessibilityLabel="OTP"
          keyboardType="number-pad"
          maxLength={6}
          value={otp}
          onChangeText={setOtp}
          style={styles.input}
        />
        <PrimaryButton title="Verify" onPress={verify} />
        <Text style={styles.sub}>
          {seconds > 0 ? `Resend in ${seconds}s` : 'Resend available'} · Mock OTP 123456
        </Text>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: space.xl, justifyContent: 'center', backgroundColor: colors.bgSoft },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  sub: { color: colors.textSecondary, marginVertical: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    minHeight: 48,
    paddingHorizontal: 14,
    marginBottom: 12,
    letterSpacing: 8,
    fontSize: 22,
    textAlign: 'center',
    backgroundColor: '#fff',
  },
});
