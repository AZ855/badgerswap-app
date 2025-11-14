import React, { useMemo, useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, Animated, Pressable, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../../theme/colors';
import { MOCK_LISTINGS } from '../../marketplace/mock/listings';
import type { Item } from '../../marketplace/types';
import ProfileHeader from '../components/ProfileHeader';
import ProfileTabs from '../components/ProfileTabs';
import ListingRow from '../components/ListingRow';
import ProfileControls from '../components/ProfileControls';
import GridCard from '../components/GridCard';
import ItemCard from '../../marketplace/components/ItemCard';

// no-op time logic moved into ListingRow

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  // Mock user profile for demo
  const user = {
    id: 'u1',
    username: 'johnnyhong',
    name: 'Johnny Hong',
    uwVerified: true,
    stats: { listings: MOCK_LISTINGS.length, sold: 0, favorites: 0 },
  };

  const [tab, setTab] = useState<'listings' | 'favorites'>('listings');
  const [status, setStatus] = useState<'all' | 'available' | 'pending' | 'sold'>('all');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const COLLAPSE_Y = 120;
  const scrollY = useRef(new Animated.Value(0)).current;
  const collapseProgress = scrollY.interpolate({ inputRange: [0, COLLAPSE_Y], outputRange: [0, 1], extrapolate: 'clamp' });
  const listRef = useRef<any>(null);
  const lastTapRef = useRef(0);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const listings: Item[] = useMemo(() => MOCK_LISTINGS, []);

  // simple tab toggling (underline handled inside ProfileTabs)

  // With Stack header shown, we do not need extra top safe padding here
  const topPad = 8;
  const bottomPad = insets.bottom + 120;

  const header = (
    <ProfileHeader
      username={user.username}
      name={user.name}
      uwVerified={user.uwVerified}
      stats={user.stats}
      onEdit={() => router.push('/edit-profile')}
      showHandle={false}
      collapseProgress={collapseProgress as any}
    />
  );

  const tabs = <ProfileTabs active={tab} onChange={(t) => setTab(t)} />;

  const controls = tab === 'listings' ? (
    <ProfileControls status={status} onStatus={setStatus} view={view} onView={setView} />
  ) : null;

  useEffect(() => {
    // Preserve current collapse state when toggling tab or view
    const target = isCollapsed ? COLLAPSE_Y : 0;
    scrollY.setValue(target);
    if (listRef.current?.scrollToOffset) {
      try { listRef.current.scrollToOffset({ offset: target, animated: false }); } catch {}
    }
  }, [tab, view]);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => {
          const now = Date.now();
          if (now - lastTapRef.current < 300) {
            if (listRef.current?.scrollToOffset) {
              listRef.current.scrollToOffset({ offset: 0, animated: true });
            }
          }
          lastTapRef.current = now;
        }}
        style={{ paddingTop: topPad }}
      >
        {header}
        {tabs}
        {controls}
      </Pressable>
      <Animated.FlatList
        ref={listRef}
        key={`${view}-${tab}`}
        data={tab === 'listings' ? listings : []}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          view === 'list'
            ? <View style={{ paddingHorizontal: 16 }}><ListingRow item={item} /></View>
            : <ItemCard item={item as any} />
        )}
        numColumns={view === 'grid' ? 2 : 1}
        columnWrapperStyle={view === 'grid' ? { justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 16 } : undefined}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={<View style={{ height: 12 }} />}
        contentContainerStyle={{ paddingBottom: bottomPad, backgroundColor: COLORS.background }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: false,
            listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
              const y = e.nativeEvent.contentOffset.y;
              const next = y > 80;
              if (next !== isCollapsed) setIsCollapsed(next);
            },
          }
        )}
        scrollEventThrottle={16}
        contentOffset={{ y: isCollapsed ? COLLAPSE_Y : 0, x: 0 }}
        ListEmptyComponent={tab === 'favorites' ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No favorites yet</Text>
            <Text style={styles.emptyText}>Tap ♥ on any item to save it here.</Text>
            <View style={{ height: 8 }} />
            <Text style={{ color: '#6B7280' }}>Browse the marketplace to add favorites.</Text>
          </View>
        ) : null}
      />
    </View>
  );
}

// Keep header collapse state consistent across tab/view toggles
// Ensure we do not flash the expand/collapse animation after a toggle
export {}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listWrap: { backgroundColor: COLORS.white },
  emptyWrap: { alignItems: 'center', padding: 24, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 6 },
  emptyText: { color: '#6B7280' },
  ctaBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginTop: 8 },
  ctaBtnText: { color: COLORS.white, fontWeight: '700' },
});
