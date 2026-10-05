import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/store/auth';
import { Chip, GlassCard, EmptyState, formatINR } from '../../src/components/ui';
import { SalonCard } from '../../src/components/cards';
import { colors, space } from '../../src/theme';

const FILTERS = ['All', 'SALON', 'PHARMACY', 'GROCERY', 'FOOD'];

export default function SearchScreen() {
  const user = useAuth((s) => s.user);
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();
  const [q, setQ] = useState('');
  const [mode, setMode] = useState<'list' | 'map'>('list');
  const [type, setType] = useState('All');
  const [sort, setSort] = useState('nearest');
  const [openNow, setOpenNow] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const salons = useQuery({
    queryKey: ['salons', q, sort, openNow, params.category, user?.city],
    queryFn: () =>
      api<any>(
        `/api/v1/salons?q=${encodeURIComponent(q)}&sort=${sort}&openNow=${openNow}&city=${encodeURIComponent(user?.city ?? '')}&lat=${user?.lat ?? ''}&lng=${user?.lng ?? ''}&category=${encodeURIComponent(params.category ?? '')}`,
      ),
  });

  const places = useQuery({
    queryKey: ['places', type, user?.lat, user?.lng],
    enabled: mode === 'map',
    queryFn: () =>
      api<any[]>(
        `/api/v1/places/nearby?lat=${user?.lat ?? 12.97}&lng=${user?.lng ?? 77.59}&type=${type}`,
      ),
  });

  const region = useMemo(
    () => ({
      latitude: user?.lat ?? 12.9716,
      longitude: user?.lng ?? 77.5946,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    }),
    [user?.lat, user?.lng],
  );

  return (
    <View style={styles.wrap}>
      <GlassCard style={styles.top}>
        <TextInput
          accessibilityLabel="Search"
          placeholder="Search salons, services..."
          value={q}
          onChangeText={setQ}
          style={styles.input}
        />
        <View style={styles.row}>
          <Chip label="List" selected={mode === 'list'} onPress={() => setMode('list')} />
          <Chip label="Map" selected={mode === 'map'} onPress={() => setMode('map')} />
          <Chip label="Open now" selected={openNow} onPress={() => setOpenNow((v) => !v)} />
        </View>
        <View style={styles.row}>
          {['nearest', 'rating', 'price'].map((s) => (
            <Chip key={s} label={s} selected={sort === s} onPress={() => setSort(s)} />
          ))}
        </View>
      </GlassCard>

      {mode === 'list' ? (
        <FlatList
          data={salons.data?.items ?? []}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          ListEmptyComponent={<EmptyState title="No salons found" subtitle="Try another city or filter" />}
          renderItem={({ item }) => (
            <SalonCard item={item} onPress={() => router.push(`/salon/${item.id}`)} />
          )}
        />
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.rowPad}>
            {FILTERS.map((f) => (
              <Chip key={f} label={f === 'SALON' ? 'Salons' : f === 'PHARMACY' ? 'Medicine' : f === 'GROCERY' ? 'Grocery' : f === 'FOOD' ? 'Food' : 'All'} selected={type === f} onPress={() => setType(f)} />
            ))}
          </View>
          <MapView style={{ flex: 1 }} provider={PROVIDER_GOOGLE} initialRegion={region} showsUserLocation>
            {(places.data ?? []).map((p) => (
              <Marker
                key={p.id}
                coordinate={{ latitude: p.lat, longitude: p.lng }}
                pinColor={p.type === 'SALON' ? colors.primary : colors.accent}
                title={`${p.distanceKm} km`}
                onPress={() => setSelected(p)}
              />
            ))}
          </MapView>
          {selected ? (
            <GlassCard style={styles.sheet}>
              <Text style={styles.title}>{selected.name}</Text>
              <Text style={styles.muted}>
                ★ {selected.rating} · {selected.distanceKm} km
                {selected.comingSoon ? ' · Coming soon' : ''}
                {selected.startingPrice ? ` · from ${formatINR(selected.startingPrice)}` : ''}
              </Text>
              {selected.salon && !selected.comingSoon ? (
                <Pressable onPress={() => router.push(`/salon/${selected.salon.id}`)}>
                  <Text style={styles.link}>View Details</Text>
                </Pressable>
              ) : (
                <Text style={styles.muted}>Coming soon on SalonSlot</Text>
              )}
            </GlassCard>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bgSoft, paddingTop: 48 },
  top: { marginHorizontal: 16, marginBottom: 8 },
  input: { minHeight: 44, fontSize: 15, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  rowPad: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 8 },
  sheet: { position: 'absolute', left: 16, right: 16, bottom: 100 },
  title: { fontWeight: '800', fontSize: 18, color: colors.text },
  muted: { color: colors.textSecondary, marginTop: 4 },
  link: { color: colors.primary, fontWeight: '700', marginTop: 10 },
});
