import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../src/lib/api';
import { EmptyState, GlassCard } from '../src/components/ui';
import { colors, space } from '../src/theme';

export default function NotificationsScreen() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<any[]>('/api/v1/notifications'),
  });
  const read = useMutation({
    mutationFn: (id: string) => api(`/api/v1/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Notifications</Text>
      <FlatList
        data={q.data ?? []}
        keyExtractor={(i) => i.id}
        ListEmptyComponent={<EmptyState title="No notifications" />}
        renderItem={({ item }) => (
          <Pressable onPress={() => !item.readAt && read.mutate(item.id)}>
            <GlassCard style={{ marginBottom: 10, opacity: item.readAt ? 0.7 : 1 }}>
              <Text style={styles.name}>{item.title}</Text>
              <Text style={styles.muted}>{item.body}</Text>
            </GlassCard>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bgSoft, padding: space.lg, paddingTop: 48 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 12, color: colors.text },
  name: { fontWeight: '800', color: colors.text },
  muted: { color: colors.textSecondary, marginTop: 4 },
});
