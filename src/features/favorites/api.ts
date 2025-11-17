import {
  db,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from '../../lib/firebase';
import type { Item } from '../marketplace/types';

export type FavoriteSnapshotCallback = (isFavorite: boolean) => void;

export function subscribeFavoriteListing(
  userId: string,
  listingId: string,
  callback: FavoriteSnapshotCallback
) {
  const ref = doc(db, 'users', userId, 'favorites', listingId);
  return onSnapshot(
    ref,
    (snap) => {
      callback(snap.exists());
    },
    (err) => {
      console.error('Failed to listen to favorite doc:', err);
      callback(false);
    }
  );
}

export async function addFavoriteListing(userId: string, item: Item) {
  const ref = doc(db, 'users', userId, 'favorites', item.id);
  await setDoc(ref, {
    listingId: item.id,
    title: item.title,
    price: item.price,
    coverImageUrl: item.coverImageUrl ?? null,
    category: item.category,
    condition: item.condition,
    location: item.location,
    imageUrls: item.imageUrls ?? [],
    description: item.description ?? null,
    sellerId: item.sellerId,
    sellerName: item.seller?.name ?? null,
    postedAt: item.postedAt ?? null,
    savedAt: serverTimestamp(),
  });
}

export async function removeFavoriteListing(userId: string, listingId: string) {
  const ref = doc(db, 'users', userId, 'favorites', listingId);
  await deleteDoc(ref);
}
