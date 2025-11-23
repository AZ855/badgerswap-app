import Constants from 'expo-constants';
import { type FirestoreError, type QuerySnapshot, type Timestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
  addDoc,
  collection,
  db,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  type User,
} from '../../lib/firebase';

type LoginActivityDoc = {
  userId?: string;
  device?: string;
  createdAt?: Timestamp;
};

export type LoginActivityEntry = {
  id: string;
  device: string;
  createdAt: Date | null;
};

export async function logLoginActivity(user: User) {
  const platformLabel =
    Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web';
  const deviceName = Constants.deviceName?.trim();
  const deviceLabel = deviceName ? `${deviceName} · ${platformLabel}` : platformLabel;

  const payload = {
    userId: user.uid,
    email: user.email ?? null,
    device: deviceLabel,
    createdAt: serverTimestamp(),
    platform: Platform.OS,
  };

  // Prefer the root collection but fall back to a per-user subcollection if rules differ.
  try {
    const activityRef = collection(db, 'loginActivity');
    await addDoc(activityRef, payload);
  } catch (err) {
    console.warn('Root loginActivity write failed, falling back to user subcollection', err);
    const scopedRef = collection(db, 'users', user.uid, 'loginActivity');
    await addDoc(scopedRef, payload);
  }
}

export function useLoginActivity(userId?: string) {
  const [entries, setEntries] = useState<LoginActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setEntries([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);

    const makeQuery = (scope: 'root' | 'user') => {
      const ref =
        scope === 'root'
          ? collection(db, 'loginActivity')
          : collection(db, 'users', userId, 'loginActivity');
      return query(ref, where('userId', '==', userId), limit(50));
    };

    const handleSnapshot = (snapshot: QuerySnapshot) => {
      const mapped: LoginActivityEntry[] = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data() as LoginActivityDoc;
          const createdAt =
            data.createdAt instanceof Date ? data.createdAt : data.createdAt?.toDate?.();
          return {
            id: docSnap.id,
            device: data.device ?? 'Unknown device',
            createdAt: createdAt ?? null,
          };
        })
        .sort((a, b) => {
          if (!a.createdAt && !b.createdAt) return 0;
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          return b.createdAt.getTime() - a.createdAt.getTime();
        })
        .slice(0, 20);
      setEntries(mapped);
      setError(null);
      setLoading(false);
    };

    const handleError = (err: FirestoreError) => {
      console.error('Failed to load login activity', err);
      setError(err?.message ?? 'Failed to load login activity.');
      setLoading(false);
    };

    let unsubscribe = onSnapshot(makeQuery('root'), handleSnapshot, (err) => {
      // If the root collection is blocked, retry with the per-user scope to match stricter rules.
      if (err?.code === 'permission-denied') {
        unsubscribe?.();
        unsubscribe = onSnapshot(makeQuery('user'), handleSnapshot, handleError);
      } else {
        handleError(err);
      }
    });

    return () => unsubscribe?.();
  }, [userId]);

  return { entries, loading, error };
}