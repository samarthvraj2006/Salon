import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Chip, PrimaryButton } from '../../../src/components/ui';
import { api } from '../../../src/lib/api';
import { colors, space } from '../../../src/theme';

function addDays(n: number) {
  const d = new Date(Date.now() + 330 * 60_000 + n * 86400000);
  return d.toISOString().slice(0, 10);
}

export default function RescheduleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [date, setDate] = useState(addDays(1));
  const [time, setTime] = useState('11:00');
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Reschedule</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {[0, 1, 2, 3, 4].map((n) => {
          const d = addDays(n);
          return <Chip key={d} label={d.slice(5)} selected={date === d} onPress={() => setDate(d)} />;
        })}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {['10:00', '11:00', '12:00', '16:00', '17:00', '18:00'].map((t) => (
          <Chip key={t} label={t} selected={time === t} onPress={() => setTime(t)} />
        ))}
      </View>
      <PrimaryButton
        title="Confirm reschedule"
        onPress={async () => {
          try {
            await api(`/api/v1/appointments/${id}/reschedule`, {
              method: 'POST',
              body: JSON.stringify({ date, startTime: time }),
            });
            Alert.alert('Updated');
            router.replace(`/booking/pass/${id}`);
          } catch (e: any) {
            Alert.alert('Failed', e.message);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bgSoft, padding: space.lg, paddingTop: 48, gap: 12 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
});
