import React, { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import QRCode from 'react-native-qrcode-svg';
import { api } from '../../../src/lib/api';
import { ErrorState, GlassCard, PrimaryButton, SecondaryButton, SkeletonCard, StatusBadge, formatINR } from '../../../src/components/ui';
import { useAuth } from '../../../src/store/auth';
import { colors, space } from '../../../src/theme';

function appointmentDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(value));
}

export default function PassScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuth((s) => s.user);
  const router = useRouter();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: ['appointment', id], queryFn: () => api<any>(`/api/v1/appointments/${id}`) });
  const a = q.data;
  const canChange = a && ['PENDING', 'CONFIRMED'].includes(a.status);

  async function cancel() {
    setBusy(true);
    try {
      await api(`/api/v1/appointments/${id}/cancel`, { method: 'POST', body: JSON.stringify({}) });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['appointment', id] }),
        qc.invalidateQueries({ queryKey: ['appointments'] }),
        qc.invalidateQueries({ queryKey: ['home-feed'] }),
      ]);
      Alert.alert('Appointment cancelled', 'Your booking has been cancelled.');
    } catch (error: any) {
      Alert.alert('Could not cancel', error?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (q.isLoading) return <View style={styles.wrap}><SkeletonCard height={360} /></View>;
  if (q.isError || !a) return <View style={styles.wrap}><ErrorState title="Couldn’t load your booking pass" retry={() => q.refetch()} /></View>;
  const serviceNames = a.services.map((service: any) => service.service.name).join(', ');
  const duration = a.services.reduce((sum: number, service: any) => sum + service.durationMin, 0);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.wrap}>
      <Text style={styles.eyebrow}>YOUR SALONSLOT PASS</Text>
      <View style={styles.header}>
        <Text style={styles.title}>Booking pass</Text>
        <StatusBadge status={a.status} />
      </View>
      <GlassCard style={styles.passCard}>
        <View style={styles.passHeader}>
          <Text style={styles.name}>{a.salon.place.name}</Text>
          <Text style={styles.code}>{a.bookingCode}</Text>
        </View>
        <View style={styles.divider} />
        <Info label="WHO" value={user?.name ?? a.customer?.name ?? 'SalonSlot customer'} />
        <Info label="WHAT" value={serviceNames} />
        <Info label="WHEN" value={`${appointmentDate(a.startTime)} · ${new Date(a.startTime).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`} />
        <Info label="DURATION" value={`${duration} minutes with ${a.staff?.name ?? 'your stylist'}`} />
        <Info label="TOTAL" value={formatINR(a.totalAmount)} />
        <Info label="WHERE" value={a.salon.place.address} />
        <View style={styles.qrWrap}>
          <QRCode value={a.qrToken} size={164} color={colors.text} backgroundColor="#fff" />
          <Text style={styles.qrHint}>Show this code at the salon</Text>
        </View>
      </GlassCard>
      <PrimaryButton title="Get directions" onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${a.salon.place.lat},${a.salon.place.lng}`)} />
      {canChange ? <View style={styles.actionGap}><SecondaryButton title="Reschedule" onPress={() => router.push(`/booking/reschedule/${id}`)} /></View> : null}
      {canChange ? <View style={styles.actionGap}><SecondaryButton title={busy ? 'Cancelling…' : 'Cancel appointment'} disabled={busy} onPress={() => Alert.alert('Cancel this appointment?', 'Your salon’s cancellation policy applies. Online payments are refunded automatically.', [{ text: 'Keep booking', style: 'cancel' }, { text: 'Cancel appointment', style: 'destructive', onPress: () => { void cancel(); } }])} /></View> : null}
    </ScrollView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bgSoft },
  wrap: { padding: space.lg, paddingTop: 48, paddingBottom: 36 },
  eyebrow: { color: colors.primary, fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  passCard: { marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.8)' },
  passHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.text },
  code: { color: colors.primary, fontWeight: '800', fontSize: 14 },
  divider: { height: 1, backgroundColor: '#DDE5E0', marginVertical: 16 },
  infoRow: { marginBottom: 13 },
  infoLabel: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, letterSpacing: 1 },
  infoValue: { fontSize: 15, color: colors.text, fontWeight: '600', marginTop: 3, lineHeight: 21 },
  qrWrap: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 16, marginTop: 8 },
  qrHint: { color: colors.textSecondary, marginTop: 10, fontSize: 12 },
  actionGap: { marginTop: 10 },
});
