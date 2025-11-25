import { Timestamp, type QueryConstraint } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  db,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query,
  where,
} from '../../lib/firebase';
import { subscribeToBlockedUsers } from '../profile/blocking';
import type { Category, Item } from './types';

export interface UseListingsOptions {
  search?: string;
  category?: Category | 'all';
  limit?: number;
  refreshKey?: number;
  currentUserId?: string;
}

type ListingDoc = {
  title?: string;
  price?: number;
  imageUrls?: unknown;
  category?: string;
  location?: string;
  locationLat?: number | null;
  locationLng?: number | null;
  condition?: string;
  status?: string;
  sellerId?: string;
  sellerName?: string;
  sellerPhotoURL?: string | null;
  sellerVerified?: boolean;
  sellerRating?: number;
  postedAt?: Timestamp;
  description?: string;
  coverImageUrl?: string | null;
};

export function useListings(options: UseListingsOptions = {}) {
  const { search = '', category = 'all', limit, refreshKey = 0, currentUserId } = options;
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [blockedByIds, setBlockedByIds] = useState<string[]>([]);

  useEffect(() => {
    if (!currentUserId) {
      setBlockedIds([]);
      return () => {};
    }

    return subscribeToBlockedUsers(currentUserId, setBlockedIds);
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) {
      setBlockedByIds([]);
      return () => {};
    }

    const blockedByQuery = query(
      collection(db, 'users'),
      where('blockedUserIds', 'array-contains', currentUserId)
    );

    const unsubscribe = onSnapshot(
      blockedByQuery,
      (snapshot) => {
        setBlockedByIds(snapshot.docs.map((docSnap) => docSnap.id));
      },
      (err) => {
        console.error('Failed to load blockers:', err);
        setBlockedByIds([]);
      }
    );

    return unsubscribe;
  }, [currentUserId]);

  useEffect(() => {
    setLoading(true);
    const constraints: QueryConstraint[] = [orderBy('postedAt', 'desc')];
    if (typeof limit === 'number') {
      constraints.push(fsLimit(limit));
    }
    const q = query(collection(db, 'listings'), ...constraints);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const mapped = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as ListingDoc;
          return mapListingFromDoc(docSnap.id, data);
        });
        setItems(mapped);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error('Failed to load listings:', err);
        setError(err?.message ?? 'Failed to load listings.');
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [limit, refreshKey]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (item.status === 'sold') return false;
      if (currentUserId) {
        if (blockedIds.includes(item.sellerId)) return false;
        if (blockedByIds.includes(item.sellerId)) return false;
      }
      const matchesQuery = !q || item.title.toLowerCase().includes(q);
      const matchesCategory = category === 'all' || item.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [items, search, category, currentUserId, blockedIds, blockedByIds]);

  return { items: filtered, loading, error };
}

export function mapListingFromDoc(id: string, data: ListingDoc): Item {
  const postedDate =
    data.postedAt instanceof Timestamp ? data.postedAt.toDate() : new Date();

  const rawImages = Array.isArray(data.imageUrls)
    ? data.imageUrls.filter((url): url is string => typeof url === 'string')
    : [];

  const coverImage =
    typeof data.coverImageUrl === 'string'
      ? data.coverImageUrl
      : rawImages[0] ?? null;

  const status: Item['status'] = ['available', 'pending', 'sold'].includes(
    (data.status as string) ?? ''
  )
    ? (data.status as Item['status'])
    : 'available';
    
  const normalizedSellerName =
    typeof data.sellerName === 'string' && data.sellerName.trim().length > 0
      ? data.sellerName.trim()
      : undefined;
  
  const sellerPhotoURL =
    typeof data.sellerPhotoURL === 'string' && data.sellerPhotoURL.trim().length > 0
      ? data.sellerPhotoURL.trim()
      : null;

    const hasValidCoords =
      typeof data.locationLat === 'number' && typeof data.locationLng === 'number';
      
  return {
    id,
    title: data.title ?? 'Untitled listing',
    price: typeof data.price === 'number' ? data.price : 0,
    category: (data.category ?? 'other') as Category,
    condition: (data.condition ?? 'Good') as Item['condition'],
    location: data.location ?? 'Madison, WI',
    locationCoordinates: hasValidCoords
      ? { lat: data.locationLat as number, lng: data.locationLng as number }
      : undefined,
    postedAt: postedDate.toISOString(),
    sellerId: data.sellerId ?? '',
    status,
    description: data.description,
    imageUrls: rawImages,
    coverImageUrl: coverImage,
    seller: normalizedSellerName
      ? {
          name: normalizedSellerName,
          verified: Boolean(data.sellerVerified),
          rating:
            typeof data.sellerRating === 'number' ? data.sellerRating : 0,
          photoURL: sellerPhotoURL,
        }
      : undefined,
  };
}