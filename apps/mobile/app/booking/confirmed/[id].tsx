import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'react-native-qrcode-svg';
import { api } from '../../../src/lib/api';
import { GlassCard, PrimaryButton, SecondaryButton } from '../../../src/components/ui';
import { colors, space } from '../../../src/theme';

export default function ConfirmedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const q = useQuery({
    queryKey: ['appointment', id],
    queryFn: () => api<any>(`/api/v1/appointments/${id}`),
  });

  useEffect(() => {
    // confetti-lite: brief accent flash via title
  }, []);

  const a = q.data;
  return (
    <View style={styles.wrap}>
      <Text style={styles.check}>✓</Text>
      <Text style={styles.title}>Booking Confirmed</Text>
      {a ? (
        <GlassCard>
          <Text style={styles.code}>{a.bookingCode}</Text>
          <View style={{ alignItems: 'center', marginVertical: 16 }}>
            <QRCode value={a.qrToken} size={140} />
          </View>
          <Text style={styles.muted}>{a.salon?.place?.name}</Text>
        </GlassCard>
      ) : null}
      <PrimaryButton title="View Booking Pass" onPress={() => router.replace(`/booking/pass/${id}`)} />
      <View style={{ height: 12 }} />
      <SecondaryButton title="Back to Home" onPress={() => router.replace('/(tabs)/home')} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bgSoft, padding: space.lg, justifyContent: 'center' },
  check: { fontSize: 64, color: colors.success, textAlign: 'center' },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 16, color: colors.text },
  code: { fontSize: 22, fontWeight: '800', textAlign: 'center', color: colors.primary },
  muted: { textAlign: 'center', color: colors.textSecondary },
});
