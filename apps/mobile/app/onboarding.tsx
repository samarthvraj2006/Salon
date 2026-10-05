import React from 'react';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PrimaryButton } from '../src/components/ui';
import { colors, space } from '../src/theme';

export default function Onboarding() {
  const router = useRouter();
  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1200' }}
      style={styles.bg}
      imageStyle={{ opacity: 0.55 }}
    >
      <View style={styles.overlay}>
        <Text style={styles.brand}>SalonSlot</Text>
        <Text style={styles.tag}>Your Salon. Your Time. No Waiting.</Text>
        <PrimaryButton title="Get Started" onPress={() => router.push('/(auth)/login')} />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#0B1F17', justifyContent: 'flex-end' },
  overlay: { padding: space.xl, paddingBottom: 48, gap: 16 },
  brand: { fontSize: 40, fontWeight: '800', color: '#fff' },
  tag: { fontSize: 18, color: '#E5E7EB', marginBottom: 12 },
});
