import React from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import QRCode from 'react-native-qrcode-svg';
import { api } from '../../../src/lib/api';
import { GlassCard, PrimaryButton, SecondaryButton, StatusBadge, formatINR } from '../../../src/components/ui';
import { useAuth } from '../../../src/store/auth';
import { colors, space } from '../../../src/theme';

export default function PassScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuth((s) => s.user);
  const router = useRouter();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['appointment', id],
    queryFn: () => api<any>(`/api/v1/appointments/${id}`),
  });
  const a = q.data;
  if (!a) return <View style={styles.wrap}><Text>Loading…</Text></View>;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Booking Pass</Text>
      <GlassCard>
        <StatusBadge status={a.status} />
        <Text style={styles.name}>{a.salon.place.name}</Text>
        <Text style={styles.muted}>{user?.name}</Text>
        <Text style={styles.muted}>{a.services.map((s: any) => s.service.name).join(', ')}</Text>
        <Text style={styles.muted}>
          {new Date(a.startTime).toLocaleString('en-IN')} ·{' '}
          {a.services.reduce((n: number, s: any) => n + s.durationMin, 0)} min
        </Text>
        <Text style={styles.muted}>{formatINR(a.totalAmount)} · {a.bookingCode}</Text>
        <Text style={styles.muted}>{a.salon.place.address}</Text>
        <View style={{ alignItems: 'center', marginVertical: 16 }}>
          <QRCode value={a.qrToken} size={160} />
        </View>
      </GlassCard>
      <PrimaryButton
        title="Get Directions"
        onPress={() =>
          Linking.openURL(
            `https://www.google.com/maps/dir/?api=1&destination=${a.salon.place.lat},${a.salon.place.lng}`,
          )
        }
      />
      <View style={{ height: 10 }} />
      <SecondaryButton
        title="Cancel Appointment"
        onPress={async () => {
          try {
            await api(`/api/v1/appointments/${id}/cancel`, { method: 'POST', body: '{}' });
            qc.invalidateQueries({ queryKey: ['appointments'] });
            Alert.alert('Cancelled');
            router.back();
          } catch (e: any) {
            Alert.alert('Cancel failed', e.message);
          }
        }}
      />
      <View style={{ height: 10 }} />
      <SecondaryButton title="Reschedule" onPress={() => router.push(`/booking/reschedule/${id}`)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bgSoft, padding: space.lg, paddingTop: 48 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 12, color: colors.text },
  name: { fontSize: 20, fontWeight: '800', marginTop: 8, color: colors.text },
  muted: { color: colors.textSecondary, marginTop: 4 },
});
