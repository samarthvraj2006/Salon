import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { CITIES } from '@salonslot/shared';
import { Chip, GlassCard, PrimaryButton } from '../src/components/ui';
import { api } from '../src/lib/api';
import { useAuth } from '../src/store/auth';
import { colors, space } from '../src/theme';

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
  Hyderabad: { lat: 17.385, lng: 78.4867 },
  Chennai: { lat: 13.0827, lng: 80.2707 },
  Mumbai: { lat: 19.076, lng: 72.8777 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  Delhi: { lat: 28.6139, lng: 77.209 },
  Bhubaneswar: { lat: 20.2961, lng: 85.8245 },
};

export default function LocationScreen() {
  const [city, setCity] = useState('Bengaluru');
  const setUser = useAuth((s) => s.setUser);
  const user = useAuth((s) => s.user);
  const router = useRouter();

  async function detect() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Enable location or pick a city');
      return;
    }
    const pos = await Location.getCurrentPositionAsync({});
    await save(city, pos.coords.latitude, pos.coords.longitude);
  }

  async function save(selected: string, lat?: number, lng?: number) {
    const coords = CITY_COORDS[selected] ?? { lat: lat ?? 12.97, lng: lng ?? 77.59 };
    const updated = await api<any>('/api/v1/me/location', {
      method: 'PUT',
      body: JSON.stringify({ city: selected, lat: lat ?? coords.lat, lng: lng ?? coords.lng }),
    });
    setUser(updated);
    router.replace('/(tabs)/home');
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Where are you?</Text>
      <Text style={styles.sub}>We'll show salons near you</Text>
      <GlassCard>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {CITIES.map((c) => (
            <Chip key={c} label={c} selected={city === c} onPress={() => setCity(c)} />
          ))}
        </View>
        <PrimaryButton title="Use current location" onPress={detect} />
        <View style={{ height: 12 }} />
        <PrimaryButton title="Continue" onPress={() => save(city)} />
      </GlassCard>
      {user?.name ? <Text style={styles.sub}>Hi {user.name}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: space.xl, backgroundColor: colors.bgSoft, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  sub: { color: colors.textSecondary, marginBottom: 16, marginTop: 6 },
});
