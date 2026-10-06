import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { GlassCard, RatingStars, Chip, formatINR } from './ui';
import { colors, space } from '../theme';

export function SalonCard({
  item,
  onPress,
  onFavorite,
  favorited,
  horizontal = false,
}: {
  item: any;
  onPress: () => void;
  onFavorite?: () => void;
  favorited?: boolean;
  horizontal?: boolean;
}) {
  const place = item.place ?? item;
  const startingPrice = item.services?.[0]?.priceInr ?? place.startingPrice;
  return (
    <GlassCard onPress={onPress} style={[styles.salonCard, horizontal ? styles.horizontalCard : styles.stackedCard]}>
      <View style={styles.imageWrap}>
        {place.imageUrl ? (
          <Image accessibilityLabel={`${place.name} interior`} source={{ uri: place.imageUrl }} style={styles.img} />
        ) : (
          <View style={[styles.img, styles.imageFallback]}><Text style={styles.fallbackMark}>S</Text></View>
        )}
        <View style={[styles.openBadge, { backgroundColor: place.isOpen ? '#EAF8EF' : '#F3F4F6' }]}>
          <View style={[styles.openDot, { backgroundColor: place.isOpen ? colors.success : colors.textDisabled }]} />
          <Text style={[styles.openText, { color: place.isOpen ? colors.success : colors.textSecondary }]}>{place.isOpen ? 'Open' : 'Closed'}</Text>
        </View>
        {onFavorite ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={favorited ? `Remove ${place.name} from favorites` : `Add ${place.name} to favorites`}
            hitSlop={8}
            onPress={(event) => { event.stopPropagation(); onFavorite(); }}
            style={styles.favorite}
          >
            <Text style={{ fontSize: 20, color: favorited ? colors.error : colors.primary }}>{favorited ? '♥' : '♡'}</Text>
          </Pressable>
        ) : null}
      </View>
      <Text numberOfLines={1} style={styles.name}>{place.name}</Text>
      <View style={styles.row}>
        <RatingStars rating={place.rating ?? 0} />
        <Text style={styles.muted}>({place.reviewCount ?? 0} reviews)</Text>
      </View>
      <Text style={styles.muted}>
        {item.distanceKm != null ? `${item.distanceKm} km away · ` : ''}
        {startingPrice != null ? `from ${formatINR(startingPrice)}` : 'See services'}
      </Text>
      {item.nextAvailable ? <Text style={styles.next}>Next slot · {item.nextAvailable}</Text> : null}
      <Text style={styles.viewLink}>View salon  →</Text>
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
    <GlassCard style={styles.serviceCard}>
      <View style={styles.row}>
        {item.imageUrl ? (
          <Image accessibilityLabel="Service" source={{ uri: item.imageUrl }} style={styles.svcImg} />
        ) : (
          <View style={[styles.svcImg, styles.serviceFallback]}><Text style={styles.serviceFallbackText}>✂</Text></View>
        )}
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.name}>{item.name}</Text>
          {item.description ? <Text style={styles.muted} numberOfLines={2}>{item.description}</Text> : null}
          <Text style={styles.servicePrice}>{formatINR(item.priceInr)} <Text style={styles.muted}>· {item.durationMin} min</Text></Text>
        </View>
      </View>
      <View style={styles.serviceAction}>
        <Text style={styles.muted}>Combine services to build your visit</Text>
        <Chip label={selected ? 'Added ✓' : 'Add'} selected={selected} onPress={onAdd} />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  salonCard: { marginBottom: 12 },
  horizontalCard: { width: 286, marginRight: 12 },
  stackedCard: { width: '100%' },
  imageWrap: { position: 'relative', marginBottom: 12 },
  img: { width: '100%', height: 148, borderRadius: 14, backgroundColor: colors.bgSoft },
  imageFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F3ED' },
  fallbackMark: { color: colors.primary, fontSize: 34, fontWeight: '800' },
  openBadge: { position: 'absolute', left: 8, top: 8, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999 },
  openDot: { height: 6, width: 6, borderRadius: 3 },
  openText: { fontSize: 11, fontWeight: '700' },
  favorite: { position: 'absolute', right: 8, top: 8, width: 38, height: 38, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  muted: { color: colors.textSecondary, fontSize: 13, marginTop: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  next: { color: colors.primary, fontWeight: '700', fontSize: 13, marginTop: 8 },
  viewLink: { color: colors.primary, fontWeight: '700', fontSize: 14, marginTop: 10 },
  serviceCard: { marginBottom: 12 },
  svcImg: { width: 76, height: 76, borderRadius: 14, backgroundColor: colors.bgSoft },
  serviceFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight },
  serviceFallbackText: { fontSize: 25, color: colors.primary },
  servicePrice: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 5 },
  serviceAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#DDE5E0' },
});
