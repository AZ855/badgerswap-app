import {
  addDoc,
  collection,
  db,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from '../../lib/firebase';
import type { Category, Item } from '../marketplace/types';
import { mapListingFromDoc } from '../marketplace/useListings';

export interface NewListingInput {
  title: string;
  price: number;
  category: Category;
  condition: Item['condition'];
  description: string;
  location: string;
  imageUrls: string[];
  sellerName: string;
  sellerPhotoURL?: string | null;
}

export interface ListingUpdate {
  title?: string;
  price?: number;
  category?: Category;
  condition?: Item['condition'];
  description?: string;
  location?: string;
  imageUrls?: string[];
  coverImageUrl?: string | null;
  status?: Item['status'];
}

// Centralizes the Firestore write so UI screens just pass normalized data + a user id.
export async function createListing(input: NewListingInput, userId: string): Promise<Item> {
  const docRef = await addDoc(collection(db, 'listings'), {
    title: input.title,
    price: input.price,
    category: input.category,
    condition: input.condition,
    description: input.description,
    location: input.location,
    imageUrls: input.imageUrls,
    coverImageUrl: input.imageUrls[0] ?? null,
    status: 'available',
    sellerName: input.sellerName,
    sellerPhotoURL: input.sellerPhotoURL ?? null,
    sellerId: userId,
    postedAt: serverTimestamp(),
  });

  const snap = await getDoc(docRef);
  type ListingDocData = Parameters<typeof mapListingFromDoc>[1];
  const data = (snap.data() ?? {}) as ListingDocData;
  return mapListingFromDoc(docRef.id, data);
}

export async function updateListing(listingId: string, updates: ListingUpdate): Promise<Item> {
  const payload = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined)
  );

  if (Object.keys(payload).length === 0) {
    throw new Error('No updates provided for this listing.');
  }

  const ref = doc(db, 'listings', listingId);
  await updateDoc(ref, payload);

  const snap = await getDoc(ref);
  type ListingDocData = Parameters<typeof mapListingFromDoc>[1];
  const data = (snap.data() ?? {}) as ListingDocData;
  return mapListingFromDoc(listingId, data);
}

export async function deleteListing(listingId: string): Promise<void> {
  const ref = doc(db, 'listings', listingId);
  await deleteDoc(ref);
}