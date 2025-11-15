import { Feather } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../../theme/colors';
// TODO: To be added
import FilterBar from '../components/FilterBar';
import ItemCard from '../components/ItemCard';
import ItemListCard from '../components/ItemListCard';
import { MOCK_LISTINGS } from '../mock/listings';
import type { Category, Item } from '../types';

export default function MarketplaceScreen() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<'all' | Category>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [debouncedQ, setDebouncedQ] = useState('');
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onChangeQuery = (text: string) => {
    setQuery(text);
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => setDebouncedQ(text.trim().toLowerCase()), 250);
  };

  const data: Item[] = useMemo(() => {
    const q = debouncedQ;
    return MOCK_LISTINGS.filter((it) => {
      const okQ = !q || it.title.toLowerCase().includes(q);
      const okC = selected === 'all' || it.category === selected;
      return okQ && okC;
    });
  }, [debouncedQ, selected]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.search}>
          <Feather name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.input}
            placeholder="Search items…"
            value={query}
            onChangeText={onChangeQuery}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        <FilterBar selected={selected} onSelect={setSelected} />
        <View style={styles.metaRow}>
          <View style={{ flex: 1 }}>
            {(query.length > 0 || selected !== 'all') && (
              <Text style={styles.resultCount}>
                {data.length} result{data.length === 1 ? '' : 's'}
              </Text>
            )}
          </View>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.viewBtn, view === 'list' && styles.viewBtnActive]}
              onPress={() => setView('list')}
            >
              <Feather name="list" size={18} color={view === 'list' ? COLORS.primary : '#6B7280'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewBtn, view === 'grid' && styles.viewBtnActive]}
              onPress={() => setView('grid')}
            >
              <Feather name="grid" size={18} color={view === 'grid' ? COLORS.primary : '#6B7280'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {data.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ color: '#6B7280' }}>No items match your search.</Text>
        </View>
      ) : (
        <FlatList
          key={view}
          data={data}
          keyExtractor={(i) => i.id}
          numColumns={view === 'grid' ? 2 : 1}
          renderItem={({ item }) => (view === 'grid' ? <ItemCard item={item} /> : <ItemListCard item={item} />)}
          contentContainerStyle={view === 'grid' ? styles.listContent : styles.listContentList}
          columnWrapperStyle={view === 'grid' ? styles.gridRow : undefined}
          ItemSeparatorComponent={view === 'list' ? () => <View style={{ height: 12 }} /> : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.white,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 16,
  },
  input: { flex: 1, marginLeft: 10, fontSize: 16, color: '#111827' },
  resultCount: { color: '#6B7280', fontSize: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  viewToggle: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 10, padding: 2, gap: 2 },
  viewBtn: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  viewBtnActive: { backgroundColor: COLORS.white },
  listContent: { padding: 16, paddingBottom: 96 },
  listContentList: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 96 },
  gridRow: { justifyContent: 'space-between', marginBottom: 16 },
});
