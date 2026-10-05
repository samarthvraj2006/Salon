import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/lib/api';
import { Chip, PrimaryButton } from '../../src/components/ui';
import { useBookingDraft } from '../../src/store/booking';
import { colors, space } from '../../src/theme';

export default function StylistScreen() {
  const draft = useBookingDraft();
  const router = useRouter();
  const q = useQuery({
    queryKey: ['staff', draft.salonId],
    enabled: !!draft.salonId,
    queryFn: () => api<any[]>(`/api/v1/salons/${draft.salonId}/staff`),
  });

  return (
    <View style={styles.wrap}>
      <Text style={styles.steps}>Service › Stylist › Date › Time › Review</Text>
      <Text style={styles.title}>Choose stylist</Text>
      <ScrollView>
        <Chip
          label="Any Available"
          selected={draft.staffId == null}
          onPress={() => draft.setStaff(null, 'Any Available')}
        />
        {(q.data ?? []).map((st) => (
          <Chip
            key={st.id}
            label={`${st.name}${st.title ? ` · ${st.title}` : ''}`}
            selected={draft.staffId === st.id}
            onPress={() => draft.setStaff(st.id, st.name)}
          />
        ))}
      </ScrollView>
      <PrimaryButton title="Next" onPress={() => router.push('/booking/slots')} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bgSoft, padding: space.lg, paddingTop: 48 },
  steps: { color: colors.primary, fontWeight: '700', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 12, color: colors.text },
});
