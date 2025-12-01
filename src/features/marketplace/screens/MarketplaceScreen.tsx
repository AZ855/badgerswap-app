import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { usePullToRefresh } from '../../../hooks/usePullToRefresh';
import { COLORS } from '../../../theme/colors';
import { useAuth } from '../../auth/AuthProvider';
import FilterBar from '../components/FilterBar';
import ItemCard from '../components/ItemCard';
import ItemListCard from '../components/ItemListCard';
import type { Category, Item } from '../types';
import { useListings } from '../useListings';

export default function MarketplaceScreen() {
  const [searchText, setSearchText] = useState('');
  const [selected, setSelected] = useState<'all' | Category>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { user } = useAuth();
  // Pair each refresh gesture with a resolver so the pull-to-refresh indicator finishes only after Firestore returns.
  const pendingRefreshResolvers = useRef<(() => void)[]>([]);

  // ViewModel hook encapsulates marketplace data fetching + filtering so this screen can stay presentational.
  const { items, loading, error } = useListings({
    search: debouncedQ,
    category: selected,
    refreshKey: refreshTick,
    currentUserId: user?.uid,
  });

  useEffect(() => {
    if (!loading && pendingRefreshResolvers.current.length) {
      pendingRefreshResolvers.current.forEach((resolve) => resolve());
      pendingRefreshResolvers.current = [];
    }
  }, [loading]);

  useEffect(
    () => () => {
      if (pendingRefreshResolvers.current.length) {
        pendingRefreshResolvers.current.forEach((resolve) => resolve());
        pendingRefreshResolvers.current = [];
      }
    },
    []
  );

  const handleRefresh = useCallback(() => {
    return new Promise<void>((resolve) => {
      pendingRefreshResolvers.current.push(resolve);
      setRefreshTick((tick) => tick + 1);
    });
  }, []);

  // Reuse the shared pull-to-refresh hook so gesture + indicator behavior stays consistent across screens.
  const pullRefresh = usePullToRefresh({
    onRefresh: handleRefresh,
    indicatorOffset: 8,
  });

  const onChangeQuery = (text: string) => {
    setSearchText(text);
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(
      () => setDebouncedQ(text.trim().toLowerCase()),
      250
    );
  };

  const data: Item[] = useMemo(() => items, [items]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.search}>
          <Feather name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.input}
            placeholder="Search items..."
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={onChangeQuery}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        <FilterBar selected={selected} onSelect={setSelected} />
        <View style={styles.metaRow}>
          <View style={{ flex: 1 }}>
            {(searchText.length > 0 || selected !== 'all') && (
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
              <Feather
                name="list"
                size={18}
                color={view === 'list' ? COLORS.primary : '#6B7280'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewBtn, view === 'grid' && styles.viewBtnActive]}
              onPress={() => setView('grid')}
            >
              <Feather
                name="grid"
                size={18}
                color={view === 'grid' ? COLORS.primary : '#6B7280'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {pullRefresh.indicator}
        {loading && items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ color: '#6B7280' }}>Loading listings...</Text>
          </View>
        ) : error ? (
          <View style={styles.empty}>
            <Text style={{ color: '#EF4444' }}>{error}</Text>
          </View>
        ) : data.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ color: '#6B7280' }}>No items match your search.</Text>
          </View>
        ) : (
          <Animated.FlatList
            key={view}
            data={data}
            keyExtractor={(i) => i.id}
            numColumns={view === 'grid' ? 2 : 1}
            renderItem={({ item }) =>
              view === 'grid' ? (
                <ItemCard item={item} />
              ) : (
                <ItemListCard item={item} />
              )
            }
            style={pullRefresh.listStyle}
            contentContainerStyle={
              view === 'grid' ? styles.listContent : styles.listContentList
            }
            columnWrapperStyle={
              view === 'grid' ? styles.gridRow : undefined
            }
            ItemSeparatorComponent={
              view === 'list' ? () => <View style={{ height: 12 }} /> : undefined
            }
            onScroll={pullRefresh.onScroll}
            onScrollEndDrag={pullRefresh.onRelease}
            onMomentumScrollEnd={pullRefresh.onRelease}
            scrollEventThrottle={16}
          />
        )}
      </View>
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
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#374151',
  },
  resultCount: { color: '#6B7280', fontSize: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 2,
    gap: 2,
  },
  viewBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBtnActive: { backgroundColor: COLORS.white },
  listContent: { padding: 16, paddingBottom: 96 },
  listContentList: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 96 },
  gridRow: { justifyContent: 'space-between', marginBottom: 16 },
});
