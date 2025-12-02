import { Feather } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../../theme/colors';
import type { Category } from '../../marketplace/types';

type Status = 'all' | 'available' | 'sold';
type ViewMode = 'list' | 'grid';
type CategoryFilter = Category | 'all';

const FAVORITE_CATEGORY_FILTERS: Array<{ value: CategoryFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'books', label: 'Books' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'sports', label: 'Sports' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'other', label: 'Other' },
];

export default function ProfileControls({
  status,
  onStatus,
  view,
  onView,
  showStatus = true,
  showCategories = false,
  categoryFilter = 'all',
  onCategoryFilter,
}: {
  status: Status;
  onStatus: (s: Status) => void;
  view: ViewMode;
  onView: (v: ViewMode) => void;
  showStatus?: boolean;
  showCategories?: boolean;
  categoryFilter?: CategoryFilter;
  onCategoryFilter?: (c: CategoryFilter) => void;
}) {
  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
        {showStatus &&
          (['all', 'available', 'sold'] as Status[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.chip, status === f && styles.chipActive]}
              onPress={() => onStatus(f)}
            >
              <Text style={[styles.chipText, status === f && styles.chipTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        {showCategories &&
          onCategoryFilter &&
          FAVORITE_CATEGORY_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[styles.chip, categoryFilter === filter.value && styles.chipActive]}
              onPress={() => onCategoryFilter(filter.value)}
            >
              <Text
                style={[styles.chipText, categoryFilter === filter.value && styles.chipTextActive]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
      </ScrollView>
      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, view === 'list' && styles.toggleBtnActive]}
          onPress={() => onView('list')}
        >
          <Feather name="list" size={18} color={view === 'list' ? COLORS.primary : '#6B7280'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, view === 'grid' && styles.toggleBtnActive]}
          onPress={() => onView('grid')}
        >
          <Feather name="grid" size={18} color={view === 'grid' ? COLORS.primary : '#6B7280'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  chipActive: { backgroundColor: COLORS.primary },
  chipText: { color: '#6B7280', fontWeight: '500' },
  chipTextActive: { color: COLORS.white },
  toggle: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 8, padding: 2 },
  toggleBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  toggleBtnActive: { backgroundColor: COLORS.white },
});
