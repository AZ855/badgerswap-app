import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Snackbar } from '../../components/Snackbar';
import { collection, db, doc, limit, onSnapshot, orderBy, query } from '../../lib/firebase';
import { COLORS } from '../../theme/colors';
import { useAuth } from '../auth/AuthProvider';
import type { Category, Item } from './types';
import { mapListingFromDoc } from './useListings';

type RecommendationFilters = {
  minPrice?: number | null;
  maxPrice?: number | null;
  categories?: Category[];
  condition?: Item['condition'] | null;
};

type RecommendationItem = {
  id: string;
  title: string;
  price: number;
  coverImageUrl?: string | null;
};

const INITIAL_FILTERS: RecommendationFilters = {};

function matchesFilters(listing: Item, filters: RecommendationFilters, currentUserId?: string) {
  if (listing.status === 'sold') return false;
  if (currentUserId && listing.sellerId === currentUserId) return false;

  const minOk = typeof filters.minPrice === 'number' ? listing.price >= filters.minPrice : true;
  const maxOk = typeof filters.maxPrice === 'number' ? listing.price <= filters.maxPrice : true;
  const categoryOk = Array.isArray(filters.categories) && filters.categories.length > 0
    ? filters.categories.includes(listing.category)
    : true;
  const conditionOk = filters.condition ? listing.condition === filters.condition : true;

  return minOk && maxOk && categoryOk && conditionOk;
}

export function RecommendationNotificationListener() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [enabled, setEnabled] = useState(false);
  const [filters, setFilters] = useState<RecommendationFilters>(INITIAL_FILTERS);
  const [recommendation, setRecommendation] = useState<RecommendationItem | null>(null);
  const [visible, setVisible] = useState(false);

  const initializedRef = useRef(false);
  const shownIdsRef = useRef<Set<string>>(new Set());
  const enableTimestampRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!user?.uid) {
      setEnabled(false);
      setFilters(INITIAL_FILTERS);
      setRecommendation(null);
      setVisible(false);
      return () => {};
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      const data = snap.data() as
        | {
            notificationPreferences?: Record<string, boolean>;
            recommendationPreferences?: RecommendationFilters;
          }
        | undefined;

      const recEnabled = data?.notificationPreferences?.recommendations ?? false;

      if (recEnabled && !enabled) {
        enableTimestampRef.current = Date.now();
        shownIdsRef.current.clear();
      }

      setEnabled(recEnabled);

      if (data?.recommendationPreferences) {
        const raw = data.recommendationPreferences;
        const categories = Array.isArray(raw.categories)
          ? raw.categories.filter((cat): cat is Category => typeof cat === 'string')
          : undefined;
        setFilters({
          minPrice: typeof raw.minPrice === 'number' ? raw.minPrice : undefined,
          maxPrice: typeof raw.maxPrice === 'number' ? raw.maxPrice : undefined,
          categories,
          condition:
            raw.condition && typeof raw.condition === 'string'
              ? (raw.condition as Item['condition'])
              : undefined,
        });
      } else {
        setFilters(INITIAL_FILTERS);
      }
    });

    return unsubscribe;
  }, [enabled, user?.uid]);

  useEffect(() => {
    if (!user?.uid || !enabled) {
      setVisible(false);
      setRecommendation(null);
      initializedRef.current = false;
      return () => {};
    }

    const listingsQuery = query(
      collection(db, 'listings'),
      orderBy('postedAt', 'desc'),
      limit(25)
    );

    const unsubscribe = onSnapshot(listingsQuery, (snapshot) => {
      if (!initializedRef.current) {
        initializedRef.current = true;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type !== 'added' && change.type !== 'modified') return;

        type ListingDocData = Parameters<typeof mapListingFromDoc>[1];
        const data = change.doc.data() as ListingDocData & { postedAt?: Timestamp };
        const listing = mapListingFromDoc(change.doc.id, data);

        const postedAtMs = new Date(listing.postedAt).getTime();
        const isRecentEnough =
          postedAtMs + 1000 >= enableTimestampRef.current || change.type === 'modified';
        if (!isRecentEnough) return;
        if (!matchesFilters(listing, filters, user.uid)) return;
        if (shownIdsRef.current.has(listing.id)) return;

        shownIdsRef.current.add(listing.id);
        setRecommendation({
          id: listing.id,
          title: listing.title,
          price: listing.price,
          coverImageUrl: listing.coverImageUrl,
        });
        setVisible(true);
      });
    });

    return () => {
      unsubscribe();
      initializedRef.current = false;
    };
  }, [enabled, filters, user?.uid]);

  const message = useMemo(() => {
    if (!recommendation) return '';
    return `We found ${recommendation.title} for $${recommendation.price.toFixed(2)}.`;
  }, [recommendation]);

  const handleView = () => {
    if (!recommendation) return;
    setVisible(false);
    router.push(`/item-detail?itemId=${recommendation.id}`);
  };

  return (
    <Snackbar
      visible={visible && Boolean(recommendation)}
      text={message}
      icon={<Feather name="star" size={18} color={COLORS.white} />}
      actionLabel="View"
      onAction={handleView}
      onPress={handleView}
      onDismiss={() => setVisible(false)}
      bottomOffset={insets.bottom}
    />
  );
}