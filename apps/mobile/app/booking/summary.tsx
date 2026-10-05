import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Chip, GlassCard, PrimaryButton, formatINR } from '../../src/components/ui';
import { useBookingDraft } from '../../src/store/booking';
import { api } from '../../src/lib/api';
import { colors, space } from '../../src/theme';

export default function SummaryScreen() {
  const draft = useBookingDraft();
  const router = useRouter();
  const [coupon, setCoupon] = useState(draft.couponCode ?? '');
  const [discount, setDiscount] = useState(draft.discount ?? 0);
  const [loading, setLoading] = useState(false);
  const subtotal = draft.services.reduce((s, x) => s + x.priceInr, 0);
  const duration = draft.services.reduce((s, x) => s + x.durationMin, 0);
  const total = Math.max(0, subtotal - discount);

  async function applyCoupon() {
    try {
      const res = await api<any>('/api/v1/promotions/validate', {
        method: 'POST',
        body: JSON.stringify({ code: coupon, salonId: draft.salonId, amount: subtotal }),
      });
      setDiscount(res.discount);
      draft.setCoupon(coupon, res.discount);
      Alert.alert('Applied', `Saved ${formatINR(res.discount)}`);
    } catch (e: any) {
      Alert.alert('Coupon', e.message);
    }
  }

  async function confirm() {
    setLoading(true);
    try {
      const appt = await api<any>('/api/v1/appointments', {
        method: 'POST',
        body: JSON.stringify({
          salonId: draft.salonId,
          serviceIds: draft.serviceIds,
          staffId: draft.staffId,
          date: draft.date,
          startTime: draft.startTime,
          paymentMethod: draft.paymentMethod,
          couponCode: coupon || undefined,
        }),
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (draft.paymentMethod === 'ONLINE') {
        router.replace(`/booking/payment/${appt.id}`);
      } else {
        router.replace(`/booking/confirmed/${appt.id}`);
      }
      draft.reset();
    } catch (e: any) {
      Alert.alert('Booking failed', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Booking Summary</Text>
      <GlassCard>
        <Text style={styles.line}>Salon: {draft.salonName}</Text>
        <Text style={styles.line}>Service(s): {draft.services.map((s) => s.name).join(', ')}</Text>
        <Text style={styles.line}>Stylist: {draft.staffName ?? 'Any Available'}</Text>
        <Text style={styles.line}>
          When: {draft.date} {draft.startTime} · {duration} min
        </Text>
        <Text style={styles.line}>Total: {formatINR(total)}</Text>
      </GlassCard>
      <Text style={styles.label}>Payment</Text>
      <View style={{ flexDirection: 'row' }}>
        <Chip
          label="Pay at Salon"
          selected={draft.paymentMethod === 'PAY_AT_SALON'}
          onPress={() => draft.setPayment('PAY_AT_SALON')}
        />
        <Chip
          label="Pay Online"
          selected={draft.paymentMethod === 'ONLINE'}
          onPress={() => draft.setPayment('ONLINE')}
        />
      </View>
      <TextInput
        placeholder="Coupon code"
        value={coupon}
        onChangeText={setCoupon}
        style={styles.input}
        autoCapitalize="characters"
      />
      <PrimaryButton title="Apply coupon" onPress={applyCoupon} />
      <View style={{ height: 12 }} />
      <PrimaryButton title={loading ? 'Booking…' : 'Confirm Booking'} onPress={confirm} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bgSoft, padding: space.lg, paddingTop: 48 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 12, color: colors.text },
  line: { color: colors.text, marginBottom: 6, fontWeight: '600' },
  label: { marginTop: 16, marginBottom: 8, fontWeight: '700', color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    minHeight: 48,
    paddingHorizontal: 14,
    marginVertical: 12,
    backgroundColor: '#fff',
  },
});
