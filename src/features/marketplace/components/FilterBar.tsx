import { Feather } from '@expo/vector-icons';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../../theme/colors';
import type { Category } from '../types';

type Cat = { id: 'all' | Category; name: string; icon: keyof typeof Feather.glyphMap };
const CATEGORIES: Cat[] = [
  { id: 'all', name: 'All', icon: 'grid' },
  { id: 'books', name: 'Books', icon: 'book' },
  { id: 'electronics', name: 'Electronics', icon: 'smartphone' },
  { id: 'furniture', name: 'Furniture', icon: 'home' },
  { id: 'clothing', name: 'Clothing', icon: 'shopping-bag' },
  { id: 'sports', name: 'Sports', icon: 'activity' },
  { id: 'kitchen', name: 'Kitchen', icon: 'coffee' },
  { id: 'other', name: 'Other', icon: 'package' },
];

export default function FilterBar({
  selected, onSelect,
}: {
  selected: 'all' | Category;
  onSelect: (c: 'all' | Category) => void;
}) {
  return (
    <View style={styles.root}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={CATEGORIES}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.chip, selected === item.id && styles.active]}
            onPress={() => onSelect(item.id)}
          >
            <Feather
              name={item.icon}
              size={16}
              color={selected === item.id ? COLORS.white : '#374151'}
            />
            <Text style={[styles.text, selected === item.id && styles.textActive]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: 8, marginBottom: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, marginRight: 8, gap: 6,
  },
  active: { backgroundColor: COLORS.primary },
  text: { fontSize: 14, color: '#374151', fontWeight: '500' },
  textActive: { color: COLORS.white },
});
