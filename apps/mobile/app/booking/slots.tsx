import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/lib/api';
import { Chip, PrimaryButton, SecondaryButton } from '../../src/components/ui';
import { useBookingDraft } from '../../src/store/booking';
import { colors, space } from '../../src/theme';

function addDays(n: number) {
  const d = new Date(Date.now() + 330 * 60_000 + n * 86400000);
  return d.toISOString().slice(0, 10);
}

export default function SlotsScreen() {
  const draft = useBookingDraft();
  const router = useRouter();
  const [date, setDate] = useState(addDays(0));
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(i)), []);

  const slots = useQuery({
    queryKey: ['slots', draft.salonId, date, draft.serviceIds.join(','), draft.staffId],
    enabled: !!draft.salonId && draft.serviceIds.length > 0,
    queryFn: () =>
      api<any>(
        `/api/v1/salons/${draft.salonId}/slots?date=${date}&serviceIds=${draft.serviceIds.join(',')}&staffId=${draft.staffId ?? 'any'}`,
      ),
  });

  const available = (slots.data?.slots ?? []).filter((s: any) => s.available);

  async function joinWaitlist() {
    try {
      await api('/api/v1/waitlist', {
        method: 'POST',
        body: JSON.stringify({
          salonId: draft.salonId,
          serviceIds: draft.serviceIds,
          date,
          preferredStaffId: draft.staffId ?? undefined,
        }),
      });
      Alert.alert('Waitlist', 'You will be notified when a slot opens');
    } catch (e: any) {
      Alert.alert('Waitlist failed', e.message);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.steps}>Service › Stylist › Date › Time › Review</Text>
      <Text style={styles.title}>Date & Time</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 56 }}>
        {days.map((d) => (
          <Chip key={d} label={d.slice(5)} selected={date === d} onPress={() => setDate(d)} />
        ))}
      </ScrollView>
      {slots.data?.nextAvailable ? (
        <Text style={styles.link}>Next available: {date === addDays(0) ? 'Today' : date} {slots.data.nextAvailable}</Text>
      ) : null}
      <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', paddingBottom: 120 }}>
        {(slots.data?.slots ?? []).map((s: any) => (
          <Chip
            key={s.time}
            label={s.time}
            tone={s.available ? (draft.startTime === s.time ? 'selected' : 'available') : 'booked'}
            selected={draft.startTime === s.time && draft.date === date}
            onPress={() => s.available && draft.setSlot(date, s.time)}
          />
        ))}
      </ScrollView>
      {!available.length ? (
        <SecondaryButton title="Join Waitlist" onPress={joinWaitlist} />
      ) : (
        <PrimaryButton
          title="Next"
          disabled={!draft.startTime || draft.date !== date}
          onPress={() => router.push('/booking/summary')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bgSoft, padding: space.lg, paddingTop: 48 },
  steps: { color: colors.primary, fontWeight: '700', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 12, color: colors.text },
  link: { color: colors.primary, fontWeight: '700', marginVertical: 8 },
});
