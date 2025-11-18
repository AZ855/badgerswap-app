import React from 'react';
// import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../../theme/colors';
import type { Item } from '../../marketplace/types';

// width handled by FlatList's numColumns + columnWrapperStyle

export default function GridCard({ item }: { item: Item }) {
  return (
    <TouchableOpacity style={[styles.card, { width: '48%' }]} onPress={() => router.push({ pathname: '/item-detail', params: { itemId: item.id } })}>
      <View style={styles.thumb}>
        <Feather name="image" size={28} color="#9CA3AF" />
        <View style={styles.ribbon}><Text style={styles.ribbonText}>${item.price}</Text></View>
      </View>
      <View style={styles.info}>
        <Text numberOfLines={2} style={styles.title}>{item.title}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.white, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  thumb: { width: '100%', aspectRatio: 1, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  info: { padding: 10 },
  title: { color: '#111827', fontWeight: '600' },
  ribbon: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(17,24,39,0.85)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ribbonText: { color: COLORS.white, fontWeight: '700', fontSize: 12 },
});
