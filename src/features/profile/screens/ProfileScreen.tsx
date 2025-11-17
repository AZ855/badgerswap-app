import React, { useMemo, useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, Animated, Pressable, NativeSyntheticEvent, NativeScrollEvent, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../../theme/colors';
import type { Category, Item } from '../../marketplace/types';
import ProfileHeader from '../components/ProfileHeader';
import ProfileTabs from '../components/ProfileTabs';
import ListingRow from '../components/ListingRow';
import ProfileControls from '../components/ProfileControls';
import ItemCard from '../../marketplace/components/ItemCard';
import { useAuth } from '../../auth/AuthProvider';
import { collection, db, onSnapshot, orderBy, query, where } from '../../../lib/firebase';
import type { Timestamp } from 'firebase/firestore';
import { mapListingFromDoc } from '../../marketplace/useListings';

// no-op time logic moved into ListingRow

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [userListings, setUserListings] = useState<Item[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [listingsError, setListingsError] = useState<string | null>(null);
  const [favoriteItems, setFavoriteItems] = useState<Item[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [favoritesError, setFavoritesError] = useState<string | null>(null);
  const { user } = useAuth();

  const email = user?.email ?? '';
  const username = email ? email.split('@')[0] ?? 'badgerswap' : 'badgerswap';
  const displayName = user?.displayName?.trim() || (email || 'BadgerSwap User');
  const uwVerified = email ? email.toLowerCase().endsWith('@wisc.edu') : false;
  const profileUser = useMemo(
    () => ({
      id: user?.uid ?? '',
      username,
      name: displayName,
      uwVerified,
      stats: { listings: userListings.length, sold: 0, favorites: favoriteItems.length },
    }),
    [user?.uid, username, displayName, uwVerified, userListings.length, favoriteItems.length]
  );

  const [tab, setTab] = useState<'listings' | 'favorites'>('listings');
  const [status, setStatus] = useState<'all' | 'available' | 'pending' | 'sold'>('all');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const COLLAPSE_Y = 120;
  const scrollY = useRef(new Animated.Value(0)).current;
  const collapseProgress = scrollY.interpolate({ inputRange: [0, COLLAPSE_Y], outputRange: [0, 1], extrapolate: 'clamp' });
  const listRef = useRef<any>(null);
  const lastTapRef = useRef(0);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const listings: Item[] = useMemo(() => userListings, [userListings]);
  const favorites: Item[] = useMemo(() => favoriteItems, [favoriteItems]);

  // simple tab toggling (underline handled inside ProfileTabs)

  // With Stack header shown, we do not need extra top safe padding here
  const topPad = 8;
  const bottomPad = insets.bottom + 120;

  const header = (
    <ProfileHeader
      username={profileUser.username}
      name={profileUser.name}
      uwVerified={profileUser.uwVerified}
      stats={profileUser.stats}
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
  if (!user?.uid) {
    setUserListings([]);
    setListingsLoading(false);
    setListingsError('Please sign in to view your listings.');
    return;
  }
  setListingsLoading(true);
  const listingsQuery = query(collection(db, 'listings'), where('sellerId', '==', user.uid));
  const unsubscribe = onSnapshot(
      listingsQuery,
      (snapshot) => {
        type ListingDocData = Parameters<typeof mapListingFromDoc>[1];
        const mapped = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data() as ListingDocData;
            return mapListingFromDoc(docSnap.id, data);
          })
          .sort(
            (a, b) =>
              new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
          );
        setUserListings(mapped);
        setListingsLoading(false);
        setListingsError(null);
      },
      (err) => {
        console.error('Failed to load user listings:', err);
        setListingsError(err?.message ?? 'Failed to load your listings.');
        setListingsLoading(false);
      }
    );
    return unsubscribe;
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setFavoriteItems([]);
      setFavoritesLoading(false);
      setFavoritesError('Please sign in to view your favorites.');
      return;
    }
    setFavoritesLoading(true);
    const favoritesQuery = query(
      collection(db, 'users', user.uid, 'favorites'),
      orderBy('savedAt', 'desc')
    );
    const unsubscribe = onSnapshot(
      favoritesQuery,
      (snapshot) => {
        const mapped = snapshot.docs.map((docSnap) =>
          mapFavoriteDocToItem(docSnap.id, docSnap.data())
        );
        setFavoriteItems(mapped);
        setFavoritesLoading(false);
        setFavoritesError(null);
      },
      (err) => {
        console.error('Failed to load favorites:', err);
        setFavoritesError(err?.message ?? 'Failed to load favorites.');
        setFavoritesLoading(false);
      }
    );
    return unsubscribe;
  }, [user?.uid]);

  useEffect(() => {
    // Preserve current collapse state when toggling tab or view
    const target = isCollapsed ? COLLAPSE_Y : 0;
    scrollY.setValue(target);
    if (listRef.current?.scrollToOffset) {
      try { listRef.current.scrollToOffset({ offset: target, animated: false }); } catch {}
    }
  }, [tab, view]);

  const isFavoritesTab = tab === 'favorites';
  const listData = isFavoritesTab ? favorites : listings;

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
        data={listData}
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
        ListEmptyComponent={
          isFavoritesTab ? (
            <View style={styles.emptyWrap}>
              {favoritesLoading ? (
                <>
                  <ActivityIndicator color={COLORS.primary} />
                  <Text style={styles.emptyText}>Loading your favorites...</Text>
                </>
              ) : favoritesError ? (
                <>
                  <Text style={styles.emptyTitle}>Couldn't load favorites</Text>
                  <Text style={styles.emptyText}>{favoritesError}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.emptyTitle}>No favorites yet</Text>
                  <Text style={styles.emptyText}>Tap the heart icon on any item to save it here.</Text>
                  <View style={{ height: 8 }} />
                  <Text style={{ color: '#6B7280' }}>Browse the marketplace to add favorites.</Text>
                </>
              )}
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              {listingsLoading ? (
                <>
                  <ActivityIndicator color={COLORS.primary} />
                  <Text style={styles.emptyText}>Loading your listings...</Text>
                </>
              ) : listingsError ? (
                <>
                  <Text style={styles.emptyTitle}>Couldn't load listings</Text>
                  <Text style={styles.emptyText}>{listingsError}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.emptyTitle}>No listings yet</Text>
                  <Text style={styles.emptyText}>Items you post will show up here.</Text>
                </>
              )}
            </View>
          )
        }
      />
    </View>
  );
}

type FavoriteDoc = {
  listingId?: string;
  title?: string;
  price?: number;
  category?: Category;
  condition?: Item['condition'];
  coverImageUrl?: string | null;
  imageUrls?: unknown;
  location?: string;
  description?: string | null;
  sellerId?: string;
  sellerName?: string | null;
  postedAt?: string | Timestamp;
};

function mapFavoriteDocToItem(docId: string, data: FavoriteDoc): Item {
  const id = data.listingId ?? docId;
  const rawPostedAt = data.postedAt;
  let postedAt: string;
  if (typeof rawPostedAt === 'string') {
    postedAt = rawPostedAt;
  } else if (rawPostedAt && typeof rawPostedAt.toDate === 'function') {
    postedAt = rawPostedAt.toDate().toISOString();
  } else {
    postedAt = new Date().toISOString();
  }

  const imageUrls = Array.isArray(data.imageUrls)
    ? data.imageUrls.filter((url): url is string => typeof url === 'string')
    : [];

  const price =
    typeof data.price === 'number'
      ? data.price
      : Number(data.price ?? 0);

  return {
    id,
    title: data.title ?? 'Untitled listing',
    price,
    condition: (data.condition ?? 'Good') as Item['condition'],
    category: (data.category ?? 'other') as Category,
    imageUrls,
    coverImageUrl:
      typeof data.coverImageUrl === 'string' ? data.coverImageUrl : null,
    location: data.location ?? 'Madison, WI',
    postedAt,
    sellerId: data.sellerId ?? '',
    description:
      typeof data.description === 'string' ? data.description : undefined,
    seller: data.sellerName
      ? { name: data.sellerName, verified: false, rating: 0 }
      : undefined,
  };
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
