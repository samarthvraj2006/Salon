import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
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

function usePressScale() {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.97, speed: 28, bounciness: 3, useNativeDriver: true }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, speed: 22, bounciness: 5, useNativeDriver: true }).start();
  return { scale, pressIn, pressOut };
}

export function GlassCard({
  children,
  style,
  onPress,
  intensity = 28,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  intensity?: number;
}) {
  const { scale, pressIn, pressOut } = usePressScale();
  const body = (
    <Animated.View style={[styles.glassWrap, style, onPress && { transform: [{ scale }] }]}>
      {Platform.OS === 'web' ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glassFallback]} />
      ) : (
        <BlurView
          pointerEvents="none"
          intensity={intensity}
          tint="light"
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={styles.glassContent}>{children}</View>
    </Animated.View>
  );

  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
    >
      {body}
    </Pressable>
  );
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { scale, pressIn, pressOut } = usePressScale();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={style}
    >
      <Animated.View style={[styles.primaryBtn, (disabled || loading) && styles.disabledBtn, { transform: [{ scale }] }]}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{title}</Text>}
      </Animated.View>
    </Pressable>
  );
}

export function SecondaryButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { scale, pressIn, pressOut } = usePressScale();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
    >
      <Animated.View style={[styles.secondaryBtn, disabled && styles.disabledBtn, { transform: [{ scale }] }]}>
        <Text style={styles.secondaryText}>{title}</Text>
      </Animated.View>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  tone = 'neutral',
  disabled,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'neutral' | 'available' | 'booked' | 'selected';
  disabled?: boolean;
}) {
  const bg =
    tone === 'booked' || disabled
      ? '#F3F4F6'
      : tone === 'selected' || selected
        ? colors.primaryLight
        : tone === 'available'
          ? '#ECFDF5'
          : colors.bgSoft;
  const color = tone === 'booked' || disabled ? colors.textDisabled : selected || tone === 'selected' ? colors.primary : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: Boolean(selected), disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, { backgroundColor: bg }, pressed && !disabled && styles.chipPressed]}
    >
      <Text style={{ color, fontWeight: selected ? '700' : '600', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { fg: string; bg: string; label: string }> = {
    CONFIRMED: { fg: colors.success, bg: '#EAF8EF', label: 'Confirmed' },
    PENDING: { fg: colors.warningDark, bg: '#FFF7E6', label: 'Pending' },
    CANCELLED: { fg: colors.error, bg: '#FEF0F0', label: 'Cancelled' },
    COMPLETED: { fg: colors.primary, bg: colors.primaryLight, label: 'Completed' },
    NO_SHOW: { fg: colors.textSecondary, bg: '#F3F4F6', label: 'No show' },
  };
  const item = map[status] ?? { fg: colors.textSecondary, bg: '#F3F4F6', label: status.replaceAll('_', ' ') };
  return (
    <View style={[styles.badge, { backgroundColor: item.bg }]}>
      <Text style={{ color: item.fg, fontWeight: '700', fontSize: 12 }}>{item.label}</Text>
    </View>
  );
}

export function EmptyState({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyMark}><Text style={styles.emptyMarkText}>✦</Text></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
      {action ? <View style={{ marginTop: space.lg, width: '100%' }}>{action}</View> : null}
    </View>
  );
}

export function SkeletonCard({ height = 132 }: { height?: number }) {
  return <View accessibilityLabel="Loading" style={[styles.skeleton, { height }]} />;
}

export function ErrorState({ title = 'Something went wrong', retry }: { title?: string; retry?: () => void }) {
  return (
    <View style={styles.errorState}>
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.emptySub}>Check your connection and try again.</Text>
      {retry ? <SecondaryButton title="Try again" onPress={retry} /> : null}
    </View>
  );
}

export function RatingStars({ rating }: { rating: number }) {
  return <Text accessibilityLabel={`${rating.toFixed(1)} out of 5 stars`} style={styles.rating}>★ {rating.toFixed(1)}</Text>;
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
    shadowColor: '#16372A',
    shadowOpacity: 0.075,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  glassFallback: { backgroundColor: colors.glassStrong },
  glassContent: { padding: space.lg },
  primaryBtn: {
    backgroundColor: colors.primary,
    minHeight: 52,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  disabledBtn: { opacity: 0.55 },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: '#B7D9C8',
    minHeight: 52,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  secondaryText: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.chip,
    marginRight: 8,
    marginBottom: 8,
    minHeight: 48,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15,91,62,0.05)',
  },
  chipPressed: { opacity: 0.78, transform: [{ scale: 0.97 }] },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  empty: { padding: 30, alignItems: 'center', justifyContent: 'center' },
  emptyMark: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyMarkText: { color: colors.primary, fontSize: 22, fontWeight: '800' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptySub: { marginTop: 8, color: colors.textSecondary, textAlign: 'center', lineHeight: 21 },
  errorState: { padding: 20, alignItems: 'center', gap: 10 },
  errorTitle: { color: colors.error, fontWeight: '700', fontSize: 16, textAlign: 'center' },
  skeleton: { borderRadius: radius.card, backgroundColor: '#E7EFEB', marginBottom: 12, opacity: 0.82 },
  rating: { color: colors.warningDark, fontWeight: '700' },
});
