import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../../../theme/colors';
import type { Item } from '../../marketplace/types';
import { router } from 'expo-router';

const timeAgo = (iso: string) => {
  const mins = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export default function ListingRow({ item }: { item: Item }) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => router.push({ pathname: '/item-detail', params: { itemId: item.id } })}>
      <View style={styles.thumb}>
        {item.coverImageUrl ? (
          <Image source={{ uri: item.coverImageUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <Feather name="image" size={24} color="#9CA3AF" />
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <View style={styles.rowBetween}>
          <Text style={styles.price}>${item.price}</Text>
          <View style={styles.catChip}><Text style={styles.catText}>{item.category}</Text></View>
        </View>
        <Text style={styles.meta}>{item.location} • {timeAgo(item.postedAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 12, overflow: 'hidden', padding: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  thumb: { width: 80, height: 80, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  info: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '600', color: '#111827' },
  price: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  catChip: { backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  catText: { color: '#6B7280', fontSize: 12 },
  meta: { color: '#6B7280', fontSize: 12, marginTop: 4 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
