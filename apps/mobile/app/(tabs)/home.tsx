import React, { useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/store/auth';
import { ErrorState, GlassCard, PrimaryButton, SkeletonCard, formatINR } from '../../src/components/ui';
import { SalonCard } from '../../src/components/cards';
import { colors, space } from '../../src/theme';

export default function HomeScreen() {
  const user = useAuth((s) => s.user);
  const router = useRouter();
  const [mix, setMix] = useState('initial');
  const feed = useQuery({
    queryKey: ['home-feed', user?.city, user?.lat, user?.lng, mix],
    queryFn: () =>
      api<{ cards: any[] }>(
        `/api/v1/home/feed?city=${encodeURIComponent(user?.city ?? '')}&lat=${user?.lat ?? ''}&lng=${user?.lng ?? ''}&mix=${encodeURIComponent(mix)}`,
      ),
  });

  return (
    <View style={styles.wrap}>
      <GlassCard style={styles.header}>
        <Pressable onPress={() => router.push('/location')}>
          <Text style={styles.eyebrow}>YOUR LOCATION</Text>
          <Text style={styles.loc}>⌖  {user?.city ?? 'Select city'}  ⌄</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={() => router.push('/(tabs)/profile')} style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.slice(0, 1)?.toUpperCase() ?? 'S'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Open notifications" onPress={() => router.push('/notifications')} style={styles.bell}>
          <Text style={{ fontSize: 18 }}>♧</Text>
        </Pressable>
      </GlassCard>
      <Pressable onPress={() => router.push('/(tabs)/search')}>
        <GlassCard style={{ marginHorizontal: 16, marginBottom: 8 }}>
          <TextInput
            editable={false}
            placeholder="Search salons, services..."
            placeholderTextColor={colors.textSecondary}
            style={{ fontSize: 15 }}
          />
        </GlassCard>
      </Pressable>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={feed.isFetching} onRefresh={() => setMix(String(Date.now()))} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {feed.isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : null}
        {feed.isError ? <ErrorState title="Couldn’t load your feed" retry={() => feed.refetch()} /> : null}
        {!feed.isLoading && !feed.isError && !feed.data?.cards?.length ? (
          <GlassCard style={styles.card}>
            <Text style={styles.title}>A better salon visit starts here</Text>
            <Text style={styles.muted}>Explore trusted salons and book a time that works for you.</Text>
            <PrimaryButton title="Find a salon" onPress={() => router.push('/(tabs)/search')} />
          </GlassCard>
        ) : null}
        {(feed.data?.cards ?? []).map((card) => (
          <FeedCard key={card.id} card={card} />
        ))}
        <PrimaryButton title="Book Appointment" onPress={() => router.push('/(tabs)/search')} />
      </ScrollView>
    </View>
  );
}

function FeedCard({ card }: { card: any }) {
  const router = useRouter();
  const p = card.payload;
  switch (card.type) {
    case 'NextAppointmentCard':
      return (
        <GlassCard style={styles.card} onPress={() => router.push(`/booking/pass/${p.id}`)}>
          <Text style={styles.kicker}>YOUR NEXT APPOINTMENT</Text>
          <Text style={styles.title}>{p.salon?.place?.name}</Text>
          <Text style={styles.muted}>
            {p.services?.[0]?.service?.name} · {new Date(p.startTime).toLocaleString('en-IN')}
          </Text>
          <Text style={styles.link}>View Booking</Text>
        </GlassCard>
      );
    case 'HeroCard':
      return (
        <GlassCard style={styles.card}>
          <Text style={styles.title}>{p.title}</Text>
          <PrimaryButton title={p.cta} onPress={() => router.push('/(tabs)/search')} />
        </GlassCard>
      );
    case 'PromoBannerCarousel':
      return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {(p.items ?? []).map((b: any) => (
            <GlassCard key={b.id} style={{ width: 280, marginRight: 12 }}>
              <Text style={styles.title}>{b.title}</Text>
              <Text style={styles.muted}>{b.description}</Text>
            </GlassCard>
          ))}
        </ScrollView>
      );
    case 'CategoryGrid':
      return (
        <GlassCard style={styles.card}>
          <Text style={styles.kicker}>Categories</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(p.items ?? []).map((c: any) => (
              <Pressable
                key={c.id}
                onPress={() => router.push({ pathname: '/(tabs)/search', params: { category: c.name } })}
                style={styles.cat}
              >
                <Text style={{ fontWeight: '600' }}>{c.name}</Text>
              </Pressable>
            ))}
          </View>
        </GlassCard>
      );
    case 'NearbySalonsCarousel':
      return (
        <View style={{ marginBottom: 12 }}>
          <Text style={[styles.kicker, { marginBottom: 8 }]}>Nearby salons</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(p.items ?? []).map((s: any) => (
              <SalonCard key={s.id} item={s} horizontal onPress={() => router.push(`/salon/${s.id}`)} />
            ))}
          </ScrollView>
        </View>
      );
    case 'OfferCard':
      return (
        <GlassCard style={styles.card}>
          <Text style={styles.title}>{p.title}</Text>
          <Text style={styles.muted}>Code: {p.code}</Text>
          <PrimaryButton title="Copy" onPress={() => Alert.alert('Coupon', p.code)} />
        </GlassCard>
      );
    case 'TrendingServiceCard':
    case 'QuickSlotCard':
      return (
        <GlassCard
          style={styles.card}
          onPress={() => p.salonId && router.push(`/salon/${p.salonId}`)}
        >
          <Text style={styles.title}>{p.title ?? `Earliest slot: ${p.time} at ${p.salonName}`}</Text>
        </GlassCard>
      );
    case 'TipCard':
      return (
        <GlassCard style={styles.card}>
          <Text style={styles.kicker}>{p.title}</Text>
          <Text style={styles.muted}>{p.body}</Text>
        </GlassCard>
      );
    case 'TopRatedSalonCard':
    case 'NewOnSalonSlotCard':
    case 'BookAgainCard':
      return (
        <GlassCard
          style={styles.card}
          onPress={() => router.push(`/salon/${p.id ?? p.salonId ?? p.salon?.id}`)}
        >
          <Text style={styles.kicker}>{card.type.replace('Card', '')}</Text>
          <Text style={styles.title}>{p.place?.name ?? p.salon?.place?.name}</Text>
          {p.services?.[0] ? (
            <Text style={styles.muted}>from {formatINR(p.services[0].priceInr)}</Text>
          ) : null}
        </GlassCard>
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bgSoft, paddingTop: 48 },
  header: {
    marginHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyebrow: { fontWeight: '700', color: colors.textSecondary, fontSize: 10, letterSpacing: 1 },
  loc: { fontWeight: '800', color: colors.text, marginTop: 2 },
  avatar: { width: 42, height: 42, borderRadius: 22, marginLeft: 'auto', backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontSize: 17, fontWeight: '800' },
  bell: { width: 42, height: 42, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.72)', alignItems: 'center', justifyContent: 'center' },
  card: { marginBottom: 12 },
  kicker: { color: colors.primary, fontWeight: '700', marginBottom: 4 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 8 },
  muted: { color: colors.textSecondary, marginBottom: 8 },
  link: { color: colors.primary, fontWeight: '700' },
  cat: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
  },
});
