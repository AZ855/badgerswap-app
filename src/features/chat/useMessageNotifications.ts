import { useEffect, useRef } from 'react';
import { useToast } from '../../components/ToastProvider';
import { db, doc, onSnapshot } from '../../lib/firebase';
import { useAuth } from '../auth/AuthProvider';
import { ChatThread, subscribeToThreads } from './api';

function getUnreadCount(thread: ChatThread, userId: string) {
  return thread.unread?.[userId] ?? 0;
}

function formatTitle(thread: ChatThread) {
  return thread.partnerName ? `New message from ${thread.partnerName}` : 'New message';
}

export function useMessageNotifications() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const previousUnreadRef = useRef<Record<string, number>>({});
  const hydratedRef = useRef(false);
  const unsubscribeThreadsRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    previousUnreadRef.current = {};
    hydratedRef.current = false;

    if (!user?.uid) {
      if (unsubscribeThreadsRef.current) {
        unsubscribeThreadsRef.current();
        unsubscribeThreadsRef.current = null;
      }
      return undefined;
    }

    const userRef = doc(db, 'users', user.uid);

    const unsubscribeUser = onSnapshot(userRef, (snap) => {
      const data = snap.data() as { notificationPreferences?: Record<string, boolean> } | undefined;
      const messagesEnabled = data?.notificationPreferences?.messages ?? true;

      if (!messagesEnabled) {
        if (unsubscribeThreadsRef.current) {
          unsubscribeThreadsRef.current();
          unsubscribeThreadsRef.current = null;
        }
        previousUnreadRef.current = {};
        hydratedRef.current = false;
        return;
      }

      if (unsubscribeThreadsRef.current) return;

      unsubscribeThreadsRef.current = subscribeToThreads(user.uid, (threads) => {
        if (!hydratedRef.current) {
          threads.forEach((thread) => {
            const key = thread.threadId || thread.id;
            if (!key) return;
            previousUnreadRef.current[key] = getUnreadCount(thread, user.uid);
          });
          hydratedRef.current = true;
          return;
        }

        threads.forEach((thread) => {
          const key = thread.threadId || thread.id;
          if (!key) return;
          const unread = getUnreadCount(thread, user.uid);
          const previous = previousUnreadRef.current[key] ?? 0;

          if (unread > previous && thread.lastMessage) {
            showToast({ title: formatTitle(thread), message: thread.lastMessage });
          }

          previousUnreadRef.current[key] = unread;
        });
      });
    });

    return () => {
      unsubscribeUser();
      if (unsubscribeThreadsRef.current) {
        unsubscribeThreadsRef.current();
        unsubscribeThreadsRef.current = null;
      }
    };
  }, [showToast, user?.uid]);
}