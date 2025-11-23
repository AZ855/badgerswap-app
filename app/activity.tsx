import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Timestamp } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../src/features/auth/AuthProvider';
import {
  collection,
  db,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from '../src/lib/firebase';
import { COLORS } from '../src/theme/colors';

type ActivityType = 'listing' | 'message' | 'favorite';

type ActivityItem = {
  id: string;
  type: ActivityType;
  title: string;
  context: string;
  createdAt: Date | null;
  icon?: React.ComponentProps<typeof Feather>['name'];
};

type StatCard = {
  label: string;
  value: string;
  helper?: string;
  icon: React.ComponentProps<typeof Feather>['name'];
};

type Shortcut = {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  description: string;
  onPress: () => void;
};

type ListingDoc = {
  title?: string;
  price?: number;
  location?: string;
  postedAt?: Timestamp | Date;
  sellerId?: string;
};

type ChatDoc = {
  itemName?: string;
  lastMessage?: string;
  timestamp?: Timestamp | Date;
  participants?: string[];
};

type FavoriteDoc = {
  title?: string;
  price?: number;
  location?: string;
  savedAt?: Timestamp | Date;
};

const SHORTCUTS: Shortcut[] = [
  {
    icon: 'activity',
    title: 'Login activity',
    description: 'See recent sign-ins and devices',
    onPress: () => router.push('/login-activity'),
  },
  {
    icon: 'edit',
    title: 'Manage listings',
    description: 'Review and update your posts',
    onPress: () => router.push('/marketplace'),
  },
];

const typeIconMap: Record<ActivityType, React.ComponentProps<typeof Feather>['name']> = {
  listing: 'tag',
  message: 'message-circle',
  favorite: 'heart',
};

const formatTimeAgo = (date: Date | null) => {
  if (!date) return '';
  const mins = Math.max(1, Math.floor((Date.now() - date.getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
};

export default function ActivityScreen() {
  const { user } = useAuth();

  const [activeFilter, setActiveFilter] = useState<ActivityType>('listing');

  const [listingActivity, setListingActivity] = useState<ActivityItem[]>([]);
  const [listingLoading, setListingLoading] = useState(true);
  const [listingError, setListingError] = useState<string | null>(null);

  const [chatActivity, setChatActivity] = useState<ActivityItem[]>([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatError, setChatError] = useState<string | null>(null);

  const [favoriteActivity, setFavoriteActivity] = useState<ActivityItem[]>([]);
  const [favoriteLoading, setFavoriteLoading] = useState(true);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);

  // ------- Listings -------
  useEffect(() => {
    if (!user?.uid) {
      setListingActivity([]);
      setListingLoading(false);
      return;
    }

    setListingLoading(true);

    const listingQuery = query(
      collection(db, 'listings'),
      where('sellerId', '==', user.uid),
      orderBy('postedAt', 'desc'),
      limit(10),
    );

    const unsubscribe = onSnapshot(
      listingQuery,
      snapshot => {
        const mapped = snapshot.docs.map(docSnap => {
          const data = docSnap.data() as ListingDoc;
          const createdAt =
            data.postedAt instanceof Date
              ? data.postedAt
              : data.postedAt?.toDate?.();
          const priceLabel =
            typeof data.price === 'number' ? `$${data.price}` : undefined;
          const contextParts = [priceLabel, data.location].filter(Boolean);

          return {
            id: `listing-${docSnap.id}`,
            type: 'listing' as const,
            title: data.title ?? 'Listing posted',
            context: contextParts.join(' · '),
            createdAt: createdAt ?? null,
            icon: 'tag' as const,
          };
        });

        setListingActivity(mapped);
        setListingError(null);
        setListingLoading(false);
      },
      err => {
        console.error('Failed to load listing activity', err);
        setListingError(err?.message ?? 'Failed to load listing activity.');
        setListingLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // ------- Chats -------
  useEffect(() => {
    if (!user?.uid) {
      setChatActivity([]);
      setChatLoading(false);
      return;
    }

    setChatLoading(true);

    const chatQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid),
      orderBy('timestamp', 'desc'),
      limit(10),
    );

    const unsubscribe = onSnapshot(
      chatQuery,
      snapshot => {
        const mapped = snapshot.docs.map(docSnap => {
          const data = docSnap.data() as ChatDoc;
          const createdAt =
            data.timestamp instanceof Date
              ? data.timestamp
              : data.timestamp?.toDate?.();

          return {
            id: `chat-${docSnap.id}`,
            type: 'message' as const,
            title: data.itemName
              ? `Chat about ${data.itemName}`
              : 'New chat',
            context: data.lastMessage ?? 'Conversation started',
            createdAt: createdAt ?? null,
            icon: 'message-circle' as const,
          };
        });

        setChatActivity(mapped);
        setChatError(null);
        setChatLoading(false);
      },
      err => {
        console.error('Failed to load chat activity', err);
        setChatError(err?.message ?? 'Failed to load chat activity.');
        setChatLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // ------- Favorites -------
  useEffect(() => {
    if (!user?.uid) {
      setFavoriteActivity([]);
      setFavoriteLoading(false);
      return;
    }

    setFavoriteLoading(true);

    const favoritesQuery = query(
      collection(db, 'users', user.uid, 'favorites'),
      orderBy('savedAt', 'desc'),
      limit(10),
    );

    const unsubscribe = onSnapshot(
      favoritesQuery,
      snapshot => {
        const mapped = snapshot.docs.map(docSnap => {
          const data = docSnap.data() as FavoriteDoc;
          const createdAt =
            data.savedAt instanceof Date
              ? data.savedAt
              : data.savedAt?.toDate?.();
          const priceLabel =
            typeof data.price === 'number' ? `$${data.price}` : undefined;
          const contextParts = [priceLabel, data.location].filter(Boolean);

          return {
            id: `favorite-${docSnap.id}`,
            type: 'favorite' as const,
            title: data.title ? `Saved "${data.title}"` : 'Saved listing',
            context: contextParts.join(' · '),
            createdAt: createdAt ?? null,
            icon: 'heart' as const,
          };
        });

        setFavoriteActivity(mapped);
        setFavoriteError(null);
        setFavoriteLoading(false);
      },
      err => {
        console.error('Failed to load favorite activity', err);
        setFavoriteError(err?.message ?? 'Failed to load favorite activity.');
        setFavoriteLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // ------- Combine all activity -------
  const combinedActivity = useMemo<ActivityItem[]>(
    () => [...listingActivity, ...favoriteActivity, ...chatActivity].sort((a, b) => {
      if (!a.createdAt && !b.createdAt) return 0;
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    }),
    [chatActivity, favoriteActivity, listingActivity],
  );

  const filteredActivity = useMemo(
    () => combinedActivity.filter(item => item.type === activeFilter),
    [activeFilter, combinedActivity],
  );

  // ------- Stats -------
  const stats: StatCard[] = useMemo(() => {
    const lastWeek = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const listingRecent = listingActivity.filter(
      item =>
        item.createdAt && item.createdAt.getTime() >= lastWeek,
    ).length;
    const messagesRecent = chatActivity.filter(
      item =>
        item.createdAt && item.createdAt.getTime() >= lastWeek,
    ).length;
    const favoritesRecent = favoriteActivity.filter(
      item =>
        item.createdAt && item.createdAt.getTime() >= lastWeek,
    ).length;

    return [
      {
        label: 'Listings posted',
        value: listingActivity.length.toString(),
        helper: listingRecent ? `+${listingRecent} this week` : undefined,
        icon: 'upload',
      },
      {
        label: 'Messages',
        value: chatActivity.length.toString(),
        helper: messagesRecent ? `${messagesRecent} this week` : undefined,
        icon: 'message-square',
      },
      {
        label: 'Favorites',
        value: favoriteActivity.length.toString(),
        helper: favoritesRecent ? `${favoritesRecent} this week` : undefined,
        icon: 'heart',  
      },
    ];
  }, [chatActivity, favoriteActivity, listingActivity]);

  const loading = user && (listingLoading || chatLoading || favoriteLoading);
  const activeError = listingError || chatError || favoriteError || null;

  // ------- UI -------
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <Text style={styles.title}>Your activity</Text>
      <Text style={styles.subtitle}>
        Check what you've been up to on BadgerSwap. Review listings, messages,
        and favorites in one place.
      </Text>
      <Text style={styles.limitNote}>
        Showing your 10 most recent items in each category.
      </Text>

      {user ? (
        <>
          {/* Stats */}
          <View style={styles.statsRow}>
            {stats.map(stat => (
              <View key={stat.label} style={styles.statCard}>
                <View style={styles.statIconCircle}>
                  <Feather
                    name={stat.icon}
                    size={16}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
                {stat.helper ? (
                  <Text style={styles.statHelper}>{stat.helper}</Text>
                ) : null}
              </View>
            ))}
          </View>

          {/* Filter */}
          <Text style={styles.sectionLabel}>Activity feed</Text>
          <View style={styles.filterRow}>
          {(['listing', 'message', 'favorite'] as ActivityType[]).map(filter => {
              const isActive = activeFilter === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterPill,
                    isActive && styles.filterPillActive,
                  ]}
                  onPress={() => setActiveFilter(filter)}
                >
                  <Text
                    style={[styles.filterText, isActive && styles.filterTextActive]}
                  >
                    {`${filter.charAt(0).toUpperCase()}${filter.slice(1)}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Activity list */}
          <View style={{ paddingHorizontal: 16 }}>
            {loading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator color={COLORS.primary} />
                <Text style={styles.emptyText}>
                  Loading your recent activity…
                </Text>
              </View>
            ) : activeError ? (
              <View style={styles.emptyState}>
                <Feather name="alert-circle" size={20} color="#EF4444" />
                <Text style={styles.emptyTitle}>Couldn't load activity</Text>
                <Text style={styles.emptyText}>{activeError}</Text>
              </View>
            ) : filteredActivity.length ? (
              filteredActivity.map(item => (
                <View key={item.id} style={styles.activityCard}>
                  <View style={styles.activityIconWrap}>
                    <Feather
                      name={item.icon || typeIconMap[item.type]}
                      size={18}
                      color={COLORS.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activityTitle}>{item.title}</Text>
                    <Text style={styles.activityContext}>{item.context}</Text>
                    <Text style={styles.activityTime}>
                      {formatTimeAgo(item.createdAt)}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Feather name="inbox" size={20} color="#9CA3AF" />
                <Text style={styles.emptyText}>
                  No activity in this category yet.
                </Text>
              </View>
            )}
          </View>

          {/* Shortcuts */}
          <Text style={styles.sectionLabel}>Shortcuts</Text>
          <View style={{ paddingHorizontal: 16 }}>
            {SHORTCUTS.map(shortcut => (
              <TouchableOpacity
                key={shortcut.title}
                style={styles.shortcutRow}
                onPress={shortcut.onPress}
              >
                <View style={styles.rowLeft}>
                  <View style={styles.shortcutIconCircle}>
                    <Feather name={shortcut.icon} size={16} color="#111827" />
                  </View>
                  <View>
                    <Text style={styles.shortcutTitle}>{shortcut.title}</Text>
                    <Text style={styles.shortcutDescription}>
                      {shortcut.description}
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : (
        <View style={[styles.emptyState, { paddingHorizontal: 16 }]}>
          <Feather name="log-in" size={20} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>Sign in to see your activity</Text>
          <Text style={styles.emptyText}>
            Log in to track your listings, messages, and saved items.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  limitNote: {
    fontSize: 12,
    color: '#9CA3AF',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionLabel: {
    marginTop: 20,
    marginBottom: 8,
    marginHorizontal: 16,
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  statIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  statHelper: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  filterPillActive: {
    backgroundColor: '#F3F4F6',
    borderColor: COLORS.primary,
  },
  filterText: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: 13,
  },
  filterTextActive: {
    color: COLORS.primary,
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    gap: 12,
  },
  activityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  activityContext: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  shortcutRow: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 12,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  shortcutIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  shortcutDescription: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 2,
  },
});
