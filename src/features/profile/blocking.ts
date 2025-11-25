import { Alert } from 'react-native';
import {
    arrayRemove,
    arrayUnion,
    db,
    doc,
    getDoc,
    onSnapshot,
    updateDoc,
} from '../../lib/firebase';

export type BlockStatus = {
  isBlocked: boolean;
  blockedByOther: boolean;
};

function readBlockedIds(data: any) {
  return Array.isArray(data?.blockedUserIds) ? (data.blockedUserIds as string[]) : [];
}

export async function updateBlockStatus(
  currentUserId: string,
  targetUserId: string,
  shouldBlock: boolean
) {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    return;
  }

  try {
    const ref = doc(db, 'users', currentUserId);
    await updateDoc(ref, {
      blockedUserIds: shouldBlock ? arrayUnion(targetUserId) : arrayRemove(targetUserId),
    });
  } catch (err) {
    console.error('Failed to update block status', err);
    Alert.alert('Unable to update block status', 'Please try again.');
  }
}

export async function fetchBlockStatus(
  currentUserId: string,
  targetUserId: string
): Promise<BlockStatus> {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    return { isBlocked: false, blockedByOther: false };
  }

  const [currentSnap, targetSnap] = await Promise.all([
    getDoc(doc(db, 'users', currentUserId)),
    getDoc(doc(db, 'users', targetUserId)),
  ]);

  const currentBlocked = readBlockedIds(currentSnap.data());
  const targetBlocked = readBlockedIds(targetSnap.data());

  return {
    isBlocked: currentBlocked.includes(targetUserId),
    blockedByOther: targetBlocked.includes(currentUserId),
  };
}

export function subscribeToBlockedUsers(
  userId: string,
  callback: (blockedIds: string[]) => void
) {
  if (!userId) return () => {};

  const ref = doc(db, 'users', userId);
  return onSnapshot(ref, (snap) => {
    callback(readBlockedIds(snap.data()));
  });
}

export function subscribeBlockStatus(
  currentUserId: string,
  targetUserId: string,
  callback: (status: BlockStatus) => void
) {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    callback({ isBlocked: false, blockedByOther: false });
    return () => {};
  }

  let currentBlocked: string[] = [];
  let targetBlocked: string[] = [];

  const emit = () => {
    callback({
      isBlocked: currentBlocked.includes(targetUserId),
      blockedByOther: targetBlocked.includes(currentUserId),
    });
  };

  const currentUnsub = onSnapshot(doc(db, 'users', currentUserId), (snap) => {
    currentBlocked = readBlockedIds(snap.data());
    emit();
  });

  const targetUnsub = onSnapshot(doc(db, 'users', targetUserId), (snap) => {
    targetBlocked = readBlockedIds(snap.data());
    emit();
  });

  return () => {
    currentUnsub();
    targetUnsub();
  };
}