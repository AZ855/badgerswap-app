import { useEffect, useRef } from 'react';
import { useToast } from '../../components/ToastProvider';
import { collection, db, doc, onSnapshot } from '../../lib/firebase';
import { useAuth } from '../auth/AuthProvider';

interface ListingSnapshotState {
  title?: string;
  price?: number;
  status?: string;
  condition?: string;
  location?: string;
  description?: string | null;
  sellerName?: string | null;
}

type ListingStateMap = Record<string, { ready: boolean; data: ListingSnapshotState | null }>;

type UnsubscribeMap = Record<string, () => void>;

export function useMarketplaceNotifications() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const enabledRef = useRef(false);
  const favoritesUnsubscribeRef = useRef<(() => void) | null>(null);
  const favoriteListingUnsubsRef = useRef<UnsubscribeMap>({});
  const favoriteListingStateRef = useRef<ListingStateMap>({});

  const cleanupFavoriteListeners = () => {
    Object.values(favoriteListingUnsubsRef.current).forEach((unsubscribe) => unsubscribe());
    favoriteListingUnsubsRef.current = {};
    favoriteListingStateRef.current = {};

    if (favoritesUnsubscribeRef.current) {
      favoritesUnsubscribeRef.current();
      favoritesUnsubscribeRef.current = null;
    }
  };

  const cleanupAll = () => {
    cleanupFavoriteListeners();
    enabledRef.current = false;
  };

  useEffect(() => {
    cleanupAll();

    if (!user?.uid) {
      return () => {};
    }

    const userRef = doc(db, 'users', user.uid);

    const unsubscribeUser = onSnapshot(userRef, (snap) => {
      const data = snap.data() as { notificationPreferences?: Record<string, boolean> } | undefined;
      const marketplaceEnabled = data?.notificationPreferences?.marketplaceActivity ?? true;

      if (!marketplaceEnabled) {
        cleanupAll();
        return;
      }

      if (enabledRef.current) return;

      // Ensure we start from a clean slate when re-enabling notifications so we don't
      // compare against stale listing state and surface toasts for updates that
      // happened while notifications were disabled.
      cleanupFavoriteListeners();
      
      enabledRef.current = true;

      // Listen to favorites for changes on saved listings.
      const favoritesRef = collection(db, 'users', user.uid, 'favorites');
      favoritesUnsubscribeRef.current = onSnapshot(
        favoritesRef,
        (snapshot) => {
          const currentIds = new Set<string>();

          snapshot.docs.forEach((docSnap) => {
            const listingId = docSnap.id;
            currentIds.add(listingId);

            if (favoriteListingUnsubsRef.current[listingId]) return;

            const listingRef = doc(db, 'listings', listingId);
            favoriteListingUnsubsRef.current[listingId] = onSnapshot(
              listingRef,
              (listingSnap) => {
                const data = listingSnap.data() as ListingSnapshotState | undefined;
                const prev = favoriteListingStateRef.current[listingId];

                if (!prev) {
                  favoriteListingStateRef.current[listingId] = { ready: true, data: data ?? null };
                  return;
                }

                favoriteListingStateRef.current[listingId] = {
                  ready: true,
                  data: data ?? null,
                };

                if (!prev.ready) {
                  return;
                }

                const previousData = prev.data;
                const statusChanged = previousData?.status !== data?.status;
                const sellerDisplayName =
                  (data?.sellerName?.trim?.() || previousData?.sellerName?.trim?.()) ?? 'the seller';

                if (statusChanged && data?.status === 'sold') {
                  showToast({
                    title: 'Item sold',
                    message: `A favorite of yours, "${data?.title ?? 'Listing'}" from ${sellerDisplayName} just sold.`,
                  });
                  return;
                }

                const fieldsToWatch: (keyof ListingSnapshotState)[] = [
                  'title',
                  'price',
                  'condition',
                  'location',
                  'description',
                ];

                const hasDetailChange = fieldsToWatch.some(
                  (field) => previousData?.[field] !== data?.[field]
                );

                if (statusChanged || hasDetailChange) {
                  showToast({
                    title: 'Saved item updated',
                    message: `"${data?.title ?? 'Listing'}" from ${sellerDisplayName} has new details.`,
                  });
                }
              },
              (err) => {
                console.error('Failed to listen to favorite listing updates', err);
              }
            );
          });

          // Remove listeners for favorites that are no longer saved.
          Object.keys(favoriteListingUnsubsRef.current).forEach((listingId) => {
            if (!currentIds.has(listingId)) {
              favoriteListingUnsubsRef.current[listingId]?.();
              delete favoriteListingUnsubsRef.current[listingId];
              delete favoriteListingStateRef.current[listingId];
            }
          });
        },
        (err) => {
          console.error('Failed to listen to favorites', err);
        }
      );
    });

    return () => {
      unsubscribeUser();
      cleanupAll();
    };
  }, [showToast, user?.uid]);
}