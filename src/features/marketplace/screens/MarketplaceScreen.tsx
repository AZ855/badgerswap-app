import { Feather } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS } from '../../../theme/colors';
// TODO: To be added
import FilterBar from '../components/FilterBar';
import ItemCard from '../components/ItemCard';
import { MOCK_LISTINGS } from '../mock/listings';
import type { Category, Item } from '../types';

export default function MarketplaceScreen() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<'all' | Category>('all');
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
        {(query.length > 0 || selected !== 'all') && (
          <Text style={styles.resultCount}>
            {data.length} result{data.length === 1 ? '' : 's'}
          </Text>
        )}
      </View>

      {data.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ color: '#6B7280' }}>No items match your search.</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(i) => i.id}
          numColumns={2}
          renderItem={({ item }) => <ItemCard item={item} />}
          columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 16 }}
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
  resultCount: { marginTop: 4, marginLeft: 16, color: '#6B7280', fontSize: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
