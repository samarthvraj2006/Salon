import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { PrimaryButton, SecondaryButton, GlassCard } from '../../src/components/ui';
import { colors, space } from '../../src/theme';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/store/auth';

const authMode = (Constants.expoConfig?.extra as any)?.authMode ?? 'mock';

export default function Login() {
  const router = useRouter();
  const setSession = useAuth((s) => s.setSession);
  const [phone, setPhone] = useState('9876543210');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function mockLogin(identity: string, name?: string) {
    setLoading(true);
    try {
      const data = await api<any>('/api/v1/auth/firebase', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ idToken: `mock:${identity}:${name ?? 'Demo User'}`, name }),
      });
      await setSession(data);
      router.replace(data.user?.city ? '/(tabs)/home' : '/location');
    } catch (e: any) {
      Alert.alert('Login failed', e.message);
    } finally {
      setLoading(false);
    }
  }

  function onPhoneContinue() {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      Alert.alert('Invalid phone', 'Enter a valid 10-digit Indian mobile number');
      return;
    }
    if (authMode === 'mock') {
      router.push({ pathname: '/(auth)/otp', params: { phone } });
    } else {
      Alert.alert('Firebase', 'Configure Firebase Phone Auth for production OTP.');
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.brand}>SalonSlot</Text>
      <Text style={styles.sub}>Login to book your next appointment</Text>
      <GlassCard>
        <Text style={styles.label}>Phone (+91)</Text>
        <TextInput
          accessibilityLabel="Phone number"
          keyboardType="phone-pad"
          maxLength={10}
          value={phone}
          onChangeText={setPhone}
          style={styles.input}
          placeholder="9876543210"
        />
        <PrimaryButton title={loading ? 'Please wait…' : 'Send OTP'} onPress={onPhoneContinue} disabled={loading} />
      </GlassCard>

      <GlassCard style={{ marginTop: 16 }}>
        <Text style={styles.label}>Google Sign-In</Text>
        <SecondaryButton
          title="Continue with Google"
          onPress={() =>
            authMode === 'mock'
              ? mockLogin('demo.google@salonslot.app', 'Google Demo')
              : Alert.alert('Google', 'Configure Google Sign-In + Firebase for production.')
          }
        />
      </GlassCard>

      <GlassCard style={{ marginTop: 16 }}>
        <Text style={styles.label}>Email (optional)</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="you@email.com" autoCapitalize="none" />
        <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
        <SecondaryButton
          title="Continue with Email"
          onPress={() => {
            if (!email.includes('@')) return Alert.alert('Enter email');
            mockLogin(email, 'Email User');
          }}
        />
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: space.xl, justifyContent: 'center', backgroundColor: colors.bgSoft },
  brand: { fontSize: 32, fontWeight: '800', color: colors.primary },
  sub: { color: colors.textSecondary, marginBottom: 20, marginTop: 6 },
  label: { fontWeight: '700', marginBottom: 8, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 48,
    marginBottom: 12,
    backgroundColor: '#fff',
    fontSize: 16,
  },
});
