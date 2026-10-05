import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/lib/api';
import { PrimaryButton, formatINR } from '../../src/components/ui';
import { ServiceCard } from '../../src/components/cards';
import { useBookingDraft } from '../../src/store/booking';
import { colors, space } from '../../src/theme';

export default function ServicesScreen() {
  const { salonId } = useLocalSearchParams<{ salonId: string }>();
  const draft = useBookingDraft();
  const router = useRouter();
  const q = useQuery({
    queryKey: ['services', salonId],
    queryFn: () => api<any[]>(`/api/v1/salons/${salonId}/services`),
  });
  const total = draft.services.reduce((s, x) => s + x.priceInr, 0);
  const duration = draft.services.reduce((s, x) => s + x.durationMin, 0);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Combine Services</Text>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        {(q.data ?? []).map((svc) => (
          <ServiceCard
            key={svc.id}
            item={svc}
            selected={draft.serviceIds.includes(svc.id)}
            onAdd={() => draft.toggleService(svc)}
          />
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <Text style={styles.muted}>
          {draft.services.length} selected · {duration} min · {formatINR(total)}
        </Text>
        <PrimaryButton
          title="Next"
          disabled={!draft.services.length}
          onPress={() => router.push('/booking/stylist')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bgSoft, padding: space.lg, paddingTop: 48 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 12, color: colors.text },
  footer: { position: 'absolute', left: 16, right: 16, bottom: 24, gap: 8 },
  muted: { color: colors.textSecondary, fontWeight: '600' },
});
