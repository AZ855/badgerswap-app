// src/features/profile/screens/ProfileScreen.tsx
import { router } from 'expo-router';
import type { Timestamp } from 'firebase/firestore';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePullToRefresh } from '../../../hooks/usePullToRefresh';
import {
  collection,
  db,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
} from '../../../lib/firebase';
import { COLORS } from '../../../theme/colors';
import { useAuth } from '../../auth/AuthProvider';
import ItemCard from '../../marketplace/components/ItemCard';
import type { Category, Item } from '../../marketplace/types';
import { mapListingFromDoc } from '../../marketplace/useListings';
import ListingRow from '../components/ListingRow';
import ProfileControls from '../components/ProfileControls';
import ProfileHeader from '../components/ProfileHeader';
import ProfileTabs from '../components/ProfileTabs';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [userListings, setUserListings] = useState<Item[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [listingsError, setListingsError] = useState<string | null>(null);
  const [favoriteItems, setFavoriteItems] = useState<Item[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [favoritesError, setFavoritesError] = useState<string | null>(null);

  // phone we read from Firestore user doc
  const [phone, setPhone] = useState<string | null>(null);

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
      stats: {
        listings: userListings.length,
        sold: 0,
        favorites: favoriteItems.length,
      },
    }),
    [user?.uid, username, displayName, uwVerified, userListings.length, favoriteItems.length]
  );

  const [tab, setTab] = useState<'listings' | 'favorites'>('listings');
  const [status, setStatus] = useState<'all' | 'available' | 'pending' | 'sold'>('all');
  const [view, setView] = useState<'list' | 'grid'>('list');

  const COLLAPSE_Y = 120;
  const scrollY = useRef(new Animated.Value(0)).current;
  const collapseProgress = scrollY.interpolate({
    inputRange: [0, COLLAPSE_Y],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const listRef = useRef<any>(null);
  const lastTapRef = useRef(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [listHeight, setListHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [listingsRefreshKey, setListingsRefreshKey] = useState(0);
  const [favoritesRefreshKey, setFavoritesRefreshKey] = useState(0);
  const pendingListingsRefresh = useRef<(() => void)[]>([]);
  const pendingFavoritesRefresh = useRef<(() => void)[]>([]);

  const listings: Item[] = useMemo(() => userListings, [userListings]);
  const favorites: Item[] = useMemo(() => favoriteItems, [favoriteItems]);
  const listData = tab === 'favorites' ? favorites : listings;
  const isFavoritesTab = tab === 'favorites';
  const collapseEnabled = contentHeight - listHeight > COLLAPSE_Y;

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
      phoneNumber={phone ?? undefined}
      photoURL={user?.photoURL ?? null}
    />
  );

  const tabs = <ProfileTabs active={tab} onChange={(t) => setTab(t)} />;

  const controls =
    tab === 'listings' ? (
      <ProfileControls
        status={status}
        onStatus={setStatus}
        view={view}
        onView={setView}
      />
    ) : null;

  const handleProfileRefresh = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (isFavoritesTab) {
        pendingFavoritesRefresh.current.push(resolve);
        setFavoritesRefreshKey((k) => k + 1);
      } else {
        pendingListingsRefresh.current.push(resolve);
        setListingsRefreshKey((k) => k + 1);
      }
    });
  }, [isFavoritesTab]);

  const pullRefresh = usePullToRefresh({
    onRefresh: handleProfileRefresh,
    indicatorOffset: topPad + 12,
  });

  useEffect(() => {
    if (!listingsLoading && pendingListingsRefresh.current.length) {
      pendingListingsRefresh.current.forEach((resolve) => resolve());
      pendingListingsRefresh.current = [];
    }
  }, [listingsLoading]);

  useEffect(() => {
    if (!favoritesLoading && pendingFavoritesRefresh.current.length) {
      pendingFavoritesRefresh.current.forEach((resolve) => resolve());
      pendingFavoritesRefresh.current = [];
    }
  }, [favoritesLoading]);

  useEffect(
    () => () => {
      if (pendingListingsRefresh.current.length) {
        pendingListingsRefresh.current.forEach((resolve) => resolve());
        pendingListingsRefresh.current = [];
      }
      if (pendingFavoritesRefresh.current.length) {
        pendingFavoritesRefresh.current.forEach((resolve) => resolve());
        pendingFavoritesRefresh.current = [];
      }
    },
    []
  );

  // Load listings for this user
  useEffect(() => {
    if (!user?.uid) {
      setUserListings([]);
      setListingsLoading(false);
      setListingsError('Please sign in to view your listings.');
      return;
    }
    setListingsLoading(true);
    const listingsQuery = query(
      collection(db, 'listings'),
      where('sellerId', '==', user.uid)
    );
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
  }, [user?.uid, listingsRefreshKey]);

  // Load favorites
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
  }, [user?.uid, favoritesRefreshKey]);

  // Keep collapse state stable
  useEffect(() => {
    if (!collapseEnabled) {
      if (isCollapsed) {
        setIsCollapsed(false);
      }
      scrollY.setValue(0);
      return;
    }
    const target = isCollapsed ? COLLAPSE_Y : 0;
    scrollY.setValue(target);
    if (listRef.current?.scrollToOffset) {
      try {
        listRef.current.scrollToOffset({ offset: target, animated: false });
      } catch {}
    }
  }, [tab, view, collapseEnabled, isCollapsed, scrollY]);

  // Listen to user doc for phone (realtime)
  useEffect(() => {
    if (!user?.uid) {
      setPhone(null);
      return;
    }
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as { phone?: string; phoneNumber?: string };
          const value = (data.phoneNumber ?? data.phone ?? '').trim();
          setPhone(value || null);
        } else {
          setPhone(null);
        }
      },
      (err) => {
        console.error('Failed to load user profile fields:', err);
      }
    );
    return unsubscribe;
  }, [user?.uid]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      pullRefresh.onScroll(e);
      const y = e.nativeEvent.contentOffset.y;
      if (!collapseEnabled) {
        scrollY.setValue(0);
        return;
      }
      scrollY.setValue(Math.max(0, y));
      const next = y > 80;
      if (next !== isCollapsed) setIsCollapsed(next);
    },
    [pullRefresh, collapseEnabled, isCollapsed, scrollY]
  );

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
      <View style={{ flex: 1 }}>
        {pullRefresh.indicator}
        <Animated.FlatList
          ref={listRef}
          key={`${view}-${tab}`}
          data={listData}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) =>
            view === 'list' ? (
              <View style={{ paddingHorizontal: 16 }}>
                <ListingRow item={item} />
              </View>
            ) : (
              <ItemCard item={item as any} />
            )
          }
          numColumns={view === 'grid' ? 2 : 1}
          columnWrapperStyle={
            view === 'grid'
              ? {
                  justifyContent: 'space-between',
                  marginBottom: 12,
                  paddingHorizontal: 16,
                }
              : undefined
          }
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListHeaderComponent={<View style={{ height: 12 }} />}
          style={pullRefresh.listStyle}
          contentContainerStyle={[
            {
              paddingBottom: bottomPad,
              backgroundColor: COLORS.background,
            },
          ]}
          onScroll={handleScroll}
          onScrollEndDrag={pullRefresh.onRelease}
          onMomentumScrollEnd={pullRefresh.onRelease}
          onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
          onContentSizeChange={(_, h) => setContentHeight(h)}
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
                    <Text style={styles.emptyText}>
                      Tap the heart icon on any item to save it here.
                    </Text>
                    <View style={{ height: 8 }} />
                    <Text style={{ color: '#6B7280' }}>
                      Browse the marketplace to add favorites.
                    </Text>
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
                    <Text style={styles.emptyText}>
                      Items you post will show up here.
                    </Text>
                  </>
                )}
              </View>
            )
          }
        />
      </View>
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

export { };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listWrap: { backgroundColor: COLORS.white },
  emptyWrap: { alignItems: 'center', padding: 24, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 6 },
  emptyText: { color: '#6B7280' },
  ctaBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  ctaBtnText: { color: COLORS.white, fontWeight: '700' },
});
