import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../../theme/colors';
import type { Item } from '../types';

const timeAgo = (iso: string) => {
  const mins = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export default function ItemListCard({ item }: { item: Item }) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/item-detail', params: { itemId: item.id } })}
    >
      <View style={styles.thumb}>
        {item.coverImageUrl ? (
          <Image source={{ uri: item.coverImageUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <Feather name="image" size={26} color="#9CA3AF" />
        )}
      </View>
      <View style={styles.info}>
        <View style={styles.rowBetween}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.price}>${item.price.toFixed(2)}</Text>
        </View>
        <View style={styles.subRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{item.category}</Text>
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            {item.location} • {timeAgo(item.postedAt)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  thumb: {
    width: 84,
    height: 84,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  info: { flex: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 16, fontWeight: '600', color: '#111827', flex: 1 },
  price: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  subRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8, flexWrap: 'wrap' },
  chip: { backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  meta: { fontSize: 12, color: '#6B7280', flexShrink: 1 },
});
