import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LocationSelection } from './components/PickupLocationModal';

export type DraftListing = {
  title: string;
  categories: string[];
  condition: string;
  price: string;
  description: string;
  images: { localUri: string; remoteUrl?: string | null }[];
  location: LocationSelection | null;
  savedAt: number;
  lastReminderAt?: number;
};

const KEY_PREFIX = 'draft_listing:';

function storageKey(userId: string) {
  return `${KEY_PREFIX}${userId}`;
}

export async function saveDraftListing(userId: string, draft: Omit<DraftListing, 'savedAt'>) {
  const payload: DraftListing = {
    ...draft,
    savedAt: Date.now(),
    lastReminderAt: draft.lastReminderAt ?? 0,
  };
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(payload));
}

export async function loadDraftListing(userId: string): Promise<DraftListing | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    return {
      title: typeof parsed.title === 'string' ? parsed.title : '',
      categories: Array.isArray(parsed.categories)
        ? parsed.categories.filter((cat: unknown): cat is string => typeof cat === 'string')
        : [],
      condition: typeof parsed.condition === 'string' ? parsed.condition : '',
      price: typeof parsed.price === 'string' ? parsed.price : '',
      description: typeof parsed.description === 'string' ? parsed.description : '',
      images: Array.isArray(parsed.images)
        ? parsed.images
            .map((img: unknown) => {
              if (!img || typeof img !== 'object') return null;
              const maybeImage = img as { localUri?: unknown; remoteUrl?: unknown };
              if (typeof maybeImage.localUri !== 'string') return null;
              return {
                localUri: maybeImage.localUri,
                remoteUrl: typeof maybeImage.remoteUrl === 'string' ? maybeImage.remoteUrl : null,
              };
            })
            .filter(
              (
                img: { localUri: string; remoteUrl?: string | null } | null
              ): img is { localUri: string; remoteUrl?: string | null } => Boolean(img)
            )
        : [],
      location:
        parsed.location && typeof parsed.location === 'object'
          ? {
              description: typeof parsed.location.description === 'string' ? parsed.location.description : '',
              lat: typeof parsed.location.lat === 'number' ? parsed.location.lat : undefined,
              lng: typeof parsed.location.lng === 'number' ? parsed.location.lng : undefined,
            }
          : null,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
      lastReminderAt: typeof parsed.lastReminderAt === 'number' ? parsed.lastReminderAt : undefined,
    };
  } catch (err) {
    console.warn('Failed to load draft listing', err);
    return null;
  }
}

export async function clearDraftListing(userId: string) {
  await AsyncStorage.removeItem(storageKey(userId));
}

export async function markDraftReminderShown(userId: string) {
  const existing = await loadDraftListing(userId);
  if (!existing) return;
  await AsyncStorage.setItem(
    storageKey(userId),
    JSON.stringify({
      ...existing,
      lastReminderAt: Date.now(),
    })
  );
}