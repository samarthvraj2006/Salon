import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { EmptyState } from '../../src/components/ui';
import { SalonCard } from '../../src/components/cards';
import { colors, space } from '../../src/theme';

export default function FavoritesScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['favorites'],
    queryFn: () => api<any[]>('/api/v1/favorites'),
  });
  const del = useMutation({
    mutationFn: (salonId: string) => api(`/api/v1/favorites/${salonId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Favorites</Text>
      <FlatList
        data={q.data ?? []}
        keyExtractor={(i) => i.salonId}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListEmptyComponent={<EmptyState title="No favorites yet" />}
        renderItem={({ item }) => (
          <SalonCard
            item={item.salon}
            favorited
            onFavorite={() => del.mutate(item.salonId)}
            onPress={() => router.push(`/salon/${item.salonId}`)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bgSoft, paddingTop: 48, paddingHorizontal: space.lg },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 12, color: colors.text },
});
