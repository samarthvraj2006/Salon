import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Chip, ErrorState, GlassCard, PrimaryButton, SkeletonCard } from '../../../src/components/ui';
import { api } from '../../../src/lib/api';
import { colors, space } from '../../../src/theme';

function addDays(offset: number) {
  const local = new Date(Date.now() + 330 * 60_000 + offset * 86_400_000);
  return local.toISOString().slice(0, 10);
}

export default function RescheduleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [date, setDate] = useState(addDays(1));
  const [time, setTime] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const qc = useQueryClient();
  const appointment = useQuery({
    queryKey: ['appointment', id],
    queryFn: () => api<any>(`/api/v1/appointments/${id}`),
  });
  const days = useMemo(() => Array.from({ length: 14 }, (_, offset) => addDays(offset)), []);
  const serviceIds = (appointment.data?.services ?? []).map((item: any) => item.serviceId).join(',');
  const slots = useQuery({
    queryKey: ['reschedule-slots', appointment.data?.salonId, date, serviceIds],
    enabled: Boolean(appointment.data?.salonId && serviceIds),
    queryFn: () => api<any>(`/api/v1/salons/${appointment.data.salonId}/slots?date=${date}&serviceIds=${serviceIds}&staffId=any`),
  });

  async function save() {
    if (!time) return;
    setBusy(true);
    try {
      await api(`/api/v1/appointments/${id}/reschedule`, {
        method: 'POST',
        body: JSON.stringify({ date, startTime: time }),
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['appointment', id] }),
        qc.invalidateQueries({ queryKey: ['appointments'] }),
        qc.invalidateQueries({ queryKey: ['home-feed'] }),
      ]);
      Alert.alert('Appointment updated', 'Your new appointment time is confirmed.');
      router.replace(`/booking/pass/${id}`);
    } catch (error: any) {
      Alert.alert('Could not reschedule', error?.message ?? 'Please choose another time.');
      slots.refetch();
    } finally {
      setBusy(false);
    }
  }

  if (appointment.isLoading) return <View style={styles.wrap}><SkeletonCard /></View>;
  if (appointment.isError || !appointment.data) return <View style={styles.wrap}><ErrorState title="Couldn’t load this booking" retry={() => appointment.refetch()} /></View>;

  const a = appointment.data;
  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>CHANGE YOUR VISIT</Text>
      <Text style={styles.title}>Choose a new time</Text>
      <Text style={styles.sub}>{a.salon?.place?.name} · {a.services?.map((item: any) => item.service.name).join(', ')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.days}>
        {days.map((day, index) => (
          <Chip key={day} label={`${index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : day.slice(5)}`} selected={date === day} onPress={() => { setDate(day); setTime(''); }} />
        ))}
      </ScrollView>
      <GlassCard style={styles.slotsCard}>
        <Text style={styles.sectionTitle}>Available times</Text>
        {slots.isLoading ? <SkeletonCard height={80} /> : null}
        {slots.isError ? <ErrorState title="Couldn’t load available times" retry={() => slots.refetch()} /> : null}
        {!slots.isLoading && !slots.isError && !slots.data?.slots?.some((slot: any) => slot.available) ? (
          <Text style={styles.sub}>No times on this date. Try another day.</Text>
        ) : null}
        <View style={styles.slotGrid}>
          {(slots.data?.slots ?? []).map((slot: any) => (
            <Chip key={slot.time} label={slot.time} tone={slot.available ? 'available' : 'booked'} selected={time === slot.time} disabled={!slot.available} onPress={() => setTime(slot.time)} />
          ))}
        </View>
      </GlassCard>
      <View style={styles.footer}>
        <PrimaryButton title="Confirm new time" onPress={save} disabled={!time || slots.isLoading || slots.isError} loading={busy} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bgSoft, paddingHorizontal: space.lg, paddingTop: 48 },
  eyebrow: { color: colors.primary, fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: 6 },
  sub: { color: colors.textSecondary, lineHeight: 21, marginTop: 6, marginBottom: 12 },
  days: { flexGrow: 0, maxHeight: 58, marginTop: 8 },
  slotsCard: { flex: 1, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 12 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  footer: { paddingVertical: 12, paddingBottom: 24 },
});
