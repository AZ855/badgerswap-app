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

export default function ItemCard({ item }: { item: Item }) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/item-detail', params: { itemId: item.id } })}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.title}`}
    >
      <View style={styles.image}>
        {item.coverImageUrl ? (
          <Image source={{ uri: item.coverImageUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <Feather name="image" size={32} color="#9CA3AF" />
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.price}>${item.price.toFixed(2)}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {item.location} • {timeAgo(item.postedAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 2, elevation: 2,
  },
  image: {
    width: '100%', height: 120, backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  info: { padding: 10, gap: 4 },
  title: { fontSize: 14, fontWeight: '600', color: '#111827' },
  price: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  meta: { fontSize: 12, color: '#6B7280' },
});
