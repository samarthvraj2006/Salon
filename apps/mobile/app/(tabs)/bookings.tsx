import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { Chip, EmptyState, GlassCard, StatusBadge, formatINR } from '../../src/components/ui';
import { colors, space } from '../../src/theme';

export default function BookingsScreen() {
  const [seg, setSeg] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const router = useRouter();
  const q = useQuery({
    queryKey: ['appointments', seg],
    queryFn: () => api<any[]>(`/api/v1/appointments?status=${seg}`),
  });

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Bookings</Text>
      <View style={styles.row}>
        {(['upcoming', 'past', 'cancelled'] as const).map((s) => (
          <Chip key={s} label={s} selected={seg === s} onPress={() => setSeg(s)} />
        ))}
      </View>
      <FlatList
        data={q.data ?? []}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListEmptyComponent={<EmptyState title="No bookings" subtitle="Book a salon in under a minute" />}
        renderItem={({ item }) => (
          <GlassCard style={{ marginBottom: 12 }} onPress={() => router.push(`/booking/pass/${item.id}`)}>
            <View style={styles.rowBetween}>
              <Text style={styles.name}>{item.salon?.place?.name}</Text>
              <StatusBadge status={item.status} />
            </View>
            <Text style={styles.muted}>
              {item.services?.map((s: any) => s.service.name).join(', ')}
            </Text>
            <Text style={styles.muted}>
              {new Date(item.startTime).toLocaleString('en-IN')} · {formatINR(item.totalAmount)}
            </Text>
            {item.status === 'COMPLETED' ? (
              <Pressable onPress={() => router.push(`/booking/review/${item.id}`)}>
                <Text style={styles.link}>Rate & Review</Text>
              </Pressable>
            ) : null}
          </GlassCard>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bgSoft, paddingTop: 48, paddingHorizontal: space.lg },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 12, color: colors.text },
  row: { flexDirection: 'row', marginBottom: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontWeight: '800', fontSize: 16, color: colors.text },
  muted: { color: colors.textSecondary, marginTop: 4 },
  link: { color: colors.primary, fontWeight: '700', marginTop: 8 },
});
