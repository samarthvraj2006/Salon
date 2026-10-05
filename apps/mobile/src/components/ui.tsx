import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, radius, space } from '../theme';

export function GlassCard({
  children,
  style,
  onPress,
  intensity = 40,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  intensity?: number;
}) {
  const body = (
    <View style={[styles.glassWrap, style]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={intensity} tint="light" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.androidFallback]} />
      )}
      <View style={styles.glassContent}>{children}</View>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
    >
      {body}
    </Pressable>
  );
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryBtn,
        disabled && { opacity: 0.5 },
        { transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
    >
      <Text style={styles.primaryText}>{title}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryBtn,
        { transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
    >
      <Text style={styles.secondaryText}>{title}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  tone = 'neutral',
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'neutral' | 'available' | 'booked' | 'selected';
}) {
  const bg =
    tone === 'selected' || selected
      ? colors.primaryLight
      : tone === 'booked'
        ? '#FEE2E2'
        : tone === 'available'
          ? '#ECFDF5'
          : colors.bgSoft;
  const color =
    tone === 'booked' ? colors.error : selected || tone === 'selected' ? colors.primary : colors.text;
  return (
    <Pressable onPress={onPress} style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={{ color, fontWeight: '600', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    CONFIRMED: colors.success,
    PENDING: colors.warning,
    CANCELLED: colors.error,
    COMPLETED: colors.primary,
  };
  return (
    <View style={[styles.badge, { backgroundColor: (map[status] ?? colors.textSecondary) + '22' }]}>
      <Text style={{ color: map[status] ?? colors.textSecondary, fontWeight: '700', fontSize: 12 }}>
        {status}
      </Text>
    </View>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
    </View>
  );
}

export function SkeletonCard() {
  return <View style={styles.skeleton} />;
}

export function RatingStars({ rating }: { rating: number }) {
  return <Text style={{ color: colors.warning, fontWeight: '700' }}>★ {rating.toFixed(1)}</Text>;
}

export function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

const styles = StyleSheet.create({
  glassWrap: {
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glass,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  androidFallback: { backgroundColor: colors.glassStrong },
  glassContent: { padding: space.lg },
  primaryBtn: {
    backgroundColor: colors.primary,
    minHeight: 48,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    minHeight: 48,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    backgroundColor: '#fff',
  },
  secondaryText: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.chip,
    marginRight: 8,
    marginBottom: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  empty: { padding: 32, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptySub: { marginTop: 8, color: colors.textSecondary, textAlign: 'center' },
  skeleton: {
    height: 120,
    borderRadius: radius.card,
    backgroundColor: '#E5E7EB',
    marginBottom: 12,
    opacity: 0.7,
  },
});
