import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { GlassCard, RatingStars, StatusBadge, formatINR, Chip } from './ui';
import { colors, space } from '../theme';

export function SalonCard({
  item,
  onPress,
  onFavorite,
  favorited,
}: {
  item: any;
  onPress: () => void;
  onFavorite?: () => void;
  favorited?: boolean;
}) {
  const place = item.place ?? item;
  return (
    <GlassCard onPress={onPress} style={{ marginBottom: 12, width: 280, marginRight: 12 }}>
      <Image source={{ uri: place.imageUrl }} style={styles.img} />
      <Text style={styles.name}>{place.name}</Text>
      <View style={styles.row}>
        <RatingStars rating={place.rating ?? 0} />
        <Text style={styles.muted}>({place.reviewCount ?? 0})</Text>
      </View>
      <Text style={styles.muted}>
        {item.distanceKm != null ? `${item.distanceKm} km · ` : ''}
        from {formatINR(item.services?.[0]?.priceInr ?? place.startingPrice ?? 0)}
      </Text>
      <View style={[styles.row, { marginTop: 8 }]}>
        <StatusBadge status={place.isOpen ? 'CONFIRMED' : 'CANCELLED'} />
        {onFavorite ? (
          <Text onPress={onFavorite} style={{ marginLeft: 'auto', fontSize: 20 }}>
            {favorited ? '♥' : '♡'}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.muted, { marginTop: 6 }]}>View Salon</Text>
    </GlassCard>
  );
}

export function ServiceCard({
  item,
  selected,
  onAdd,
}: {
  item: any;
  selected?: boolean;
  onAdd: () => void;
}) {
  return (
    <GlassCard style={{ marginBottom: 12 }}>
      <View style={styles.row}>
        <Image source={{ uri: item.imageUrl }} style={styles.svcImg} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.muted}>
            {item.durationMin} min · {formatINR(item.priceInr)}
          </Text>
          <Chip label={selected ? 'Added' : 'Add'} selected={selected} onPress={onAdd} />
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  img: { width: '100%', height: 120, borderRadius: 14, marginBottom: space.sm, backgroundColor: colors.bgSoft },
  svcImg: { width: 72, height: 72, borderRadius: 12, backgroundColor: colors.bgSoft },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  muted: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
