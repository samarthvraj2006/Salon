import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Chip, GlassCard, PrimaryButton } from '../../../src/components/ui';
import { api } from '../../../src/lib/api';
import { colors, space } from '../../../src/theme';

export default function PaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [method, setMethod] = useState<'UPI' | 'CARD' | 'NETBANKING' | 'WALLET'>('UPI');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function pay(outcome: 'success' | 'failure' | 'pending') {
    setBusy(true);
    try {
      const { payment, order } = await api<any>('/api/v1/payments/create-order', {
        method: 'POST',
        body: JSON.stringify({ appointmentId: id, method }),
      });
      await api('/api/v1/payments/verify', {
        method: 'POST',
        body: JSON.stringify({
          paymentId: payment.id,
          providerOrderId: order.id,
          status: outcome,
        }),
      });
      if (outcome === 'success') router.replace(`/booking/confirmed/${id}`);
      else Alert.alert('Payment', outcome);
    } catch (e: any) {
      Alert.alert('Payment failed', e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Pay Online</Text>
      <GlassCard>
        <Text style={styles.muted}>Mock gateway — pick a method</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
          {(['UPI', 'CARD', 'NETBANKING', 'WALLET'] as const).map((m) => (
            <Chip key={m} label={m} selected={method === m} onPress={() => setMethod(m)} />
          ))}
        </View>
      </GlassCard>
      <PrimaryButton title={busy ? 'Processing…' : 'Pay successfully'} onPress={() => pay('success')} disabled={busy} />
      <View style={{ height: 10 }} />
      <PrimaryButton title="Simulate failure" onPress={() => pay('failure')} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bgSoft, padding: space.lg, paddingTop: 48 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 12, color: colors.text },
  muted: { color: colors.textSecondary },
});
