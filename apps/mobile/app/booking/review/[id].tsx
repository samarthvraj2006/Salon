import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Chip, PrimaryButton } from '../../../src/components/ui';
import { api } from '../../../src/lib/api';
import { colors, space } from '../../../src/theme';

export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Rate & Review</Text>
      <View style={{ flexDirection: 'row' }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Chip key={n} label={`${n}★`} selected={rating === n} onPress={() => setRating(n)} />
        ))}
      </View>
      <TextInput
        placeholder="Optional comment"
        value={comment}
        onChangeText={setComment}
        style={styles.input}
        multiline
      />
      <PrimaryButton
        title="Submit"
        onPress={async () => {
          try {
            await api('/api/v1/reviews', {
              method: 'POST',
              body: JSON.stringify({ appointmentId: id, rating, comment }),
            });
            Alert.alert('Thanks!', 'Verified review submitted');
            router.back();
          } catch (e: any) {
            Alert.alert('Failed', e.message);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bgSoft, padding: space.lg, paddingTop: 48 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 12, color: colors.text },
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 12,
    marginVertical: 12,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
});
