import React, { useState } from 'react';
import {
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../src/lib/api';
import { Chip, GlassCard, PrimaryButton, RatingStars, SkeletonCard, formatINR } from '../../src/components/ui';
import { ServiceCard } from '../../src/components/cards';
import { useBookingDraft } from '../../src/store/booking';
import { colors, space } from '../../src/theme';

export default function SalonDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<'About' | 'Services' | 'Reviews'>('About');
  const router = useRouter();
  const qc = useQueryClient();
  const draft = useBookingDraft();
  const salon = useQuery({
    queryKey: ['salon', id],
    queryFn: () => api<any>(`/api/v1/salons/${id}`),
  });
  const fav = useMutation({
    mutationFn: () => api('/api/v1/favorites', { method: 'POST', body: JSON.stringify({ salonId: id }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });

  if (salon.isLoading) {
    return (
      <View style={styles.wrap}>
        <SkeletonCard />
      </View>
    );
  }
  const s = salon.data;
  if (!s) return <Text>Salon not found</Text>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <Image source={{ uri: s.coverImages?.[0] ?? s.place.imageUrl }} style={styles.hero} />
        <Text style={styles.imgCount}>1/{s.coverImages?.length ?? 1}</Text>
        <View style={{ padding: space.lg }}>
          <View style={styles.rowBetween}>
            <Text style={styles.title}>{s.place.name}</Text>
            <Pressable onPress={() => fav.mutate()}>
              <Text style={{ fontSize: 24 }}>♡</Text>
            </Pressable>
          </View>
          <View style={styles.row}>
            <RatingStars rating={s.place.rating} />
            <Text style={styles.muted}>({s.place.reviewCount})</Text>
            <Text style={styles.muted}>
              · {s.place.isOpen ? 'Open' : 'Closed'}
              {s.distanceKm != null ? ` · ${s.distanceKm} km` : ''}
            </Text>
          </View>
          <Text style={styles.muted}>Starting {formatINR(s.services?.[0]?.priceInr ?? 0)}</Text>
          <View style={[styles.row, { marginVertical: 12, gap: 8 }]}>
            <PrimaryButton title="Call" onPress={() => s.place.phone && Linking.openURL(`tel:${s.place.phone}`)} />
            <PrimaryButton
              title="Get Directions"
              onPress={() =>
                Linking.openURL(
                  `https://www.google.com/maps/dir/?api=1&destination=${s.place.lat},${s.place.lng}`,
                )
              }
            />
          </View>
          <View style={styles.row}>
            {(['About', 'Services', 'Reviews'] as const).map((t) => (
              <Chip key={t} label={t} selected={tab === t} onPress={() => setTab(t)} />
            ))}
          </View>
          {tab === 'About' ? (
            <GlassCard>
              <Text style={styles.muted}>{s.place.description}</Text>
              <Text style={[styles.muted, { marginTop: 8 }]}>{s.place.address}</Text>
              {s.nextAvailable ? <Text style={styles.link}>Next available: {s.nextAvailable}</Text> : null}
            </GlassCard>
          ) : null}
          {tab === 'Services' ? (
            <View>
              {s.services.map((svc: any) => (
                <ServiceCard
                  key={svc.id}
                  item={svc}
                  selected={draft.serviceIds.includes(svc.id)}
                  onAdd={() => {
                    draft.setSalon(s.id, s.place.name);
                    draft.toggleService(svc);
                  }}
                />
              ))}
            </View>
          ) : null}
          {tab === 'Reviews' ? (
            <View>
              {(s.reviews ?? []).map((r: any) => (
                <GlassCard key={r.id} style={{ marginBottom: 8 }}>
                  <RatingStars rating={r.rating} />
                  <Text style={styles.muted}>{r.comment || 'Verified review'}</Text>
                  <Text style={styles.muted}>— {r.user?.name}</Text>
                </GlassCard>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
      <View style={styles.sticky}>
        <PrimaryButton
          title="Book Appointment"
          onPress={() => {
            draft.setSalon(s.id, s.place.name);
            router.push(`/booking/services?salonId=${s.id}`);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16, backgroundColor: colors.bgSoft },
  hero: { width: '100%', height: 240, backgroundColor: colors.bgSoft },
  imgCount: { position: 'absolute', top: 48, right: 16, color: '#fff', fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, flex: 1 },
  muted: { color: colors.textSecondary },
  link: { color: colors.primary, fontWeight: '700', marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  rowBetween: { flexDirection: 'row', alignItems: 'center' },
  sticky: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
  },
});
