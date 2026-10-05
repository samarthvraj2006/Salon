import React from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { GlassCard, PrimaryButton, SecondaryButton } from '../../src/components/ui';
import { useAuth } from '../../src/store/auth';
import { api } from '../../src/lib/api';
import { colors, space } from '../../src/theme';

export default function ProfileScreen() {
  const { user, setUser, clear } = useAuth();
  const router = useRouter();

  async function toggleNotify(value: boolean) {
    const updated = await api<any>('/api/v1/me', {
      method: 'PATCH',
      body: JSON.stringify({ notifyPush: value }),
    });
    setUser(updated);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Profile</Text>
      <GlassCard>
        <Text style={styles.name}>{user?.name ?? 'Customer'}</Text>
        <Text style={styles.muted}>{user?.phone ? `+91 ${user.phone}` : user?.email}</Text>
        <Text style={styles.muted}>Location: {user?.city ?? '—'}</Text>
      </GlassCard>
      <GlassCard style={{ marginTop: 12 }}>
        <View style={styles.row}>
          <Text style={styles.label}>Push notifications</Text>
          <Switch value={user?.notifyPush !== false} onValueChange={toggleNotify} />
        </View>
        <Text style={styles.muted}>Payment methods — placeholder list</Text>
        <Text style={styles.muted}>• UPI · Cards · Wallets (coming soon)</Text>
      </GlassCard>
      <View style={{ height: 12 }} />
      <SecondaryButton title="Help" onPress={() => Alert.alert('Help', 'Email support@salonslot.app')} />
      <View style={{ height: 12 }} />
      <PrimaryButton
        title="Logout"
        onPress={async () => {
          try {
            await api('/api/v1/auth/logout', { method: 'POST', body: '{}' });
          } catch {}
          await clear();
          router.replace('/onboarding');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bgSoft, paddingTop: 48, padding: space.lg },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 12, color: colors.text },
  name: { fontSize: 20, fontWeight: '800', color: colors.text },
  muted: { color: colors.textSecondary, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { fontWeight: '600', color: colors.text },
});
