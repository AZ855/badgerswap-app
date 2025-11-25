import { useEffect, useState } from 'react';
import { BlockStatus, subscribeBlockStatus } from '../features/profile/blocking';

export function useBlockingStatus(currentUserId?: string, targetUserId?: string) {
  const [status, setStatus] = useState<BlockStatus>({ isBlocked: false, blockedByOther: false });
  const [loading, setLoading] = useState(Boolean(currentUserId && targetUserId));

  useEffect(() => {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
      setStatus({ isBlocked: false, blockedByOther: false });
      setLoading(false);
      return () => {};
    }

    setLoading(true);
    const unsubscribe = subscribeBlockStatus(currentUserId, targetUserId, (nextStatus) => {
      setStatus(nextStatus);
      setLoading(false);
    });

    return unsubscribe;
  }, [currentUserId, targetUserId]);

  return { ...status, loading };
}