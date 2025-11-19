import { addDoc, collection, db, getDoc, serverTimestamp } from '../../lib/firebase';
import type { Item, Category } from '../marketplace/types';
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
    sellerName: input.sellerName,
    sellerId: userId,
    postedAt: serverTimestamp(),
  });

  const snap = await getDoc(docRef);
  type ListingDocData = Parameters<typeof mapListingFromDoc>[1];
  const data = (snap.data() ?? {}) as ListingDocData;
  return mapListingFromDoc(docRef.id, data);
}
