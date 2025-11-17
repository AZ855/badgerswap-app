import { useEffect, useMemo, useState } from 'react';
import { collection, db, limit as fsLimit, onSnapshot, orderBy, query } from '../../lib/firebase';
import { Timestamp, type QueryConstraint } from 'firebase/firestore';
import type { Category, Item } from './types';

export interface UseListingsOptions {
  search?: string;
  category?: Category | 'all';
  limit?: number;
}

type ListingDoc = {
  title?: string;
  price?: number;
  imageUrls?: unknown;
  category?: string;
  location?: string;
  condition?: string;
  sellerId?: string;
  sellerName?: string;
  sellerVerified?: boolean;
  sellerRating?: number;
  postedAt?: Timestamp;
  description?: string;
  coverImageUrl?: string;
};

export function useListings(options: UseListingsOptions = {}) {
  const { search = '', category = 'all', limit } = options;
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, [limit]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery = !q || item.title.toLowerCase().includes(q);
      const matchesCategory = category === 'all' || item.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [items, search, category]);

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

  const normalizedSellerName =
    typeof data.sellerName === 'string' && data.sellerName.trim().length > 0
      ? data.sellerName.trim()
      : undefined;

  return {
    id,
    title: data.title ?? 'Untitled listing',
    price: typeof data.price === 'number' ? data.price : 0,
    category: (data.category ?? 'other') as Category,
    condition: (data.condition ?? 'Good') as Item['condition'],
    location: data.location ?? 'Madison, WI',
    postedAt: postedDate.toISOString(),
    sellerId: data.sellerId ?? '',
    description: data.description,
    imageUrls: rawImages,
    coverImageUrl: coverImage,
    seller: normalizedSellerName
      ? {
          name: normalizedSellerName,
          verified: Boolean(data.sellerVerified),
          rating:
            typeof data.sellerRating === 'number' ? data.sellerRating : 0,
        }
      : undefined,
  };
}
