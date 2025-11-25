import {
  addDoc,
  collection,
  db,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from '../../lib/firebase';
import type { Category, Item } from '../marketplace/types';
import { mapListingFromDoc } from '../marketplace/useListings';

type ListingDocData = Parameters<typeof mapListingFromDoc>[1];

function normalizeTitle(title: string): string {
  return title.trim();
}

function normalizeTitleForComparison(title: string): string {
  return normalizeTitle(title).toLowerCase();
}

async function assertUniqueTitleForSeller(
  title: string,
  sellerId: string,
  excludeListingId?: string
) {
  const titleForComparison = normalizeTitleForComparison(title);

  const normalizedMatches = await getDocs(
    query(
      collection(db, 'listings'),
      where('sellerId', '==', sellerId),
      where('titleNormalized', '==', titleForComparison),
      limit(1)
    )
  );

  let duplicate = normalizedMatches.docs.find((docSnap) => docSnap.id !== excludeListingId);

  if (!duplicate) {
    const sellerListings = await getDocs(query(collection(db, 'listings'), where('sellerId', '==', sellerId)));

    duplicate = sellerListings.docs.find((docSnap) => {
      if (docSnap.id === excludeListingId) return false;

      const data = docSnap.data() as ListingDocData;
      const docNormalized =
        typeof data.titleNormalized === 'string'
          ? data.titleNormalized
          : normalizeTitleForComparison(data.title ?? '');

      return docNormalized === titleForComparison;
    });
  }

  if (duplicate) {
    throw new Error('You already posted an item with this title. Please choose a new title.');
  }
}

export interface NewListingInput {
  title: string;
  price: number;
  category: Category;
  condition: Item['condition'];
  description: string;
  location: string;
  locationCoordinates?: { lat: number; lng: number } | null;
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
  locationCoordinates?: { lat: number; lng: number } | null;
  imageUrls?: string[];
  coverImageUrl?: string | null;
  status?: Item['status'];
}

// Centralizes the Firestore write so UI screens just pass normalized data + a user id.
export async function createListing(input: NewListingInput, userId: string): Promise<Item> {
  await assertUniqueTitleForSeller(input.title, userId);

  const normalizedTitle = normalizeTitle(input.title);
  const titleForComparison = normalizeTitleForComparison(input.title);

  const docRef = await addDoc(collection(db, 'listings'), {
    title: normalizedTitle,
    titleNormalized: titleForComparison,
    price: input.price,
    category: input.category,
    condition: input.condition,
    description: input.description,
    location: input.location,
    locationLat: input.locationCoordinates?.lat ?? null,
    locationLng: input.locationCoordinates?.lng ?? null,
    imageUrls: input.imageUrls,
    coverImageUrl: input.imageUrls[0] ?? null,
    status: 'available',
    sellerName: input.sellerName,
    sellerPhotoURL: input.sellerPhotoURL ?? null,
    sellerId: userId,
    postedAt: serverTimestamp(),
  });

  const snap = await getDoc(docRef);
  const data = (snap.data() ?? {}) as ListingDocData;
  return mapListingFromDoc(docRef.id, data);
}

export async function updateListing(listingId: string, updates: ListingUpdate): Promise<Item> {
  const { locationCoordinates, ...rest } = updates;

  type ListingUpdatePayload = Partial<
    Pick<
      ListingDocData,
      | 'title'
      | 'titleNormalized'
      | 'price'
      | 'category'
      | 'condition'
      | 'description'
      | 'location'
      | 'imageUrls'
      | 'coverImageUrl'
      | 'status'
    >
  > & { locationLat?: number | null; locationLng?: number | null };

  const payload: ListingUpdatePayload = {};

  const ref = doc(db, 'listings', listingId);

  const normalizedTitle = rest.title ? normalizeTitle(rest.title) : undefined;
  const titleForComparison = rest.title ? normalizeTitleForComparison(rest.title) : undefined;

  if (normalizedTitle !== undefined) {
    const currentSnap = await getDoc(ref);
    if (!currentSnap.exists()) {
      throw new Error('Listing not found.');
    }
    const currentData = currentSnap.data() as ListingDocData;
    const sellerId = typeof currentData.sellerId === 'string' ? currentData.sellerId : '';
    if (!sellerId) {
      throw new Error('Unable to verify the listing owner.');
    }
    await assertUniqueTitleForSeller(normalizedTitle, sellerId, listingId);
    payload.title = normalizedTitle;
    payload.titleNormalized = titleForComparison;
  }
  if (rest.price !== undefined) payload.price = rest.price;
  if (rest.category !== undefined) payload.category = rest.category;
  if (rest.condition !== undefined) payload.condition = rest.condition;
  if (rest.description !== undefined) payload.description = rest.description;
  if (rest.location !== undefined) payload.location = rest.location;
  if (rest.imageUrls !== undefined) payload.imageUrls = rest.imageUrls;
  if (rest.coverImageUrl !== undefined) payload.coverImageUrl = rest.coverImageUrl;
  if (rest.status !== undefined) payload.status = rest.status;

  if (locationCoordinates) {
    payload.locationLat = locationCoordinates.lat;
    payload.locationLng = locationCoordinates.lng;
  } else if (locationCoordinates === null) {
    payload.locationLat = null;
    payload.locationLng = null;
  }

  if (Object.keys(payload).length === 0) {
    throw new Error('No updates provided for this listing.');
  }

  await updateDoc(ref, payload);

  const snap = await getDoc(ref);
  const data = (snap.data() ?? {}) as ListingDocData;
  return mapListingFromDoc(listingId, data);
}

export async function deleteListing(listingId: string): Promise<void> {
  const ref = doc(db, 'listings', listingId);
  await deleteDoc(ref);
}