import { useEffect, useRef } from 'react';
import { useToast } from '../../components/ToastProvider';
import { db, doc, onSnapshot } from '../../lib/firebase';
import { useAuth } from '../auth/AuthProvider';
import { ChatThread, subscribeToThreads } from './api';

/* =====================================================================
 * Helper: Get unread count for a specific user on a specific thread
 * ---------------------------------------------------------------------
 * Each thread contains an "unread" object:
 *    unread[userId] = number of unread messages
 *
 * If the unread count is missing, default to 0.
 * ===================================================================== */
function getUnreadCount(thread: ChatThread, userId: string) {
  return thread.unread?.[userId] ?? 0;
}

/* =====================================================================
 * Helper: Format toast notification title
 * ---------------------------------------------------------------------
 * If the thread contains partnerName, show "New message from X".
 * Otherwise display a generic title.
 * ===================================================================== */
function formatTitle(thread: ChatThread) {
  return thread.partnerName ? `New message from ${thread.partnerName}` : 'New message';
}

/* =====================================================================
 * useMessageNotifications
 * ---------------------------------------------------------------------
 * This hook handles:
 *
 *  ✔ Listening to the current user's notification preferences
 *  ✔ Subscribing to all chat threads for that user
 *  ✔ Detecting when unread count increases
 *  ✔ Showing a toast notification for new messages
 *
 * It listens in real time using:
 *    - Firestore user document (notification preferences)
 *    - subscribeToThreads (real-time threads listener)
 *
 * It also tracks:
 *    • previousUnreadRef → stores unread count before the update
 *    • hydratedRef → prevents firing toasts on initial load
 *    • lastEnabledRef → timestamp when notifications were last enabled
 * ===================================================================== */
export function useMessageNotifications() {

  const { user } = useAuth();
  const { showToast } = useToast();

  // Tracks unread count per thread from previous snapshot.
  const previousUnreadRef = useRef<Record<string, number>>({});

  // Prevents triggering notifications during initial hydration.
  const hydratedRef = useRef(false);

  // Stores unsubscribe function for the threads listener.
  const unsubscribeThreadsRef = useRef<(() => void) | null>(null);

  // Tracks when notifications were last enabled.
  const lastEnabledRef = useRef<number>(Date.now());



  /* ====================================================================
   * Main useEffect — Handles all notification logic
   * ==================================================================== */
  useEffect(() => {

    // Reset local state whenever user changes.
    previousUnreadRef.current = {};
    hydratedRef.current = false;



    /* ---------------------------------------------------------------
     * If there is no logged-in user:
     *   - Clean up existing listener
     *   - Stop all notification tracking
     * --------------------------------------------------------------- */
    if (!user?.uid) {
      if (unsubscribeThreadsRef.current) {
        unsubscribeThreadsRef.current();
        unsubscribeThreadsRef.current = null;
      }
      return undefined;
    }

    /* ---------------------------------------------------------------
     * Subscribe to this user's Firestore document
     * to read notification preferences in real-time.
     * --------------------------------------------------------------- */
    const userRef = doc(db, 'users', user.uid);

    const unsubscribeUser = onSnapshot(userRef, (snap) => {

      const data = snap.data() as { notificationPreferences?: Record<string, boolean> } | undefined;

      // Whether message notifications are enabled for this user.
      const messagesEnabled = data?.notificationPreferences?.messages ?? true;



      /* -------------------------------------------------------------
       * If message notifications are disabled:
       *   - Remove thread listener
       *   - Reset unread state
       *   - Stop processing
       * ------------------------------------------------------------- */
      if (!messagesEnabled) {

        if (unsubscribeThreadsRef.current) {
          unsubscribeThreadsRef.current();
          unsubscribeThreadsRef.current = null;
        }

        previousUnreadRef.current = {};
        hydratedRef.current = false;
        return;
      }



      /* -------------------------------------------------------------
       * When notifications are re-enabled:
       *   Record the current time so we only notify
       *   for messages that arrive after this moment.
       * ------------------------------------------------------------- */
      lastEnabledRef.current = Date.now();



      /* -------------------------------------------------------------
       * If already subscribed to threads, do not re-subscribe.
       * ------------------------------------------------------------- */
      if (unsubscribeThreadsRef.current) return;



      /* -------------------------------------------------------------
       * Subscribe to ALL chat threads for this user.
       * This listener fires whenever:
       *    - a message arrives
       *    - unread count changes
       *    - partner name changes
       *    - lastMessage updates
       * ------------------------------------------------------------- */
      unsubscribeThreadsRef.current = subscribeToThreads(user.uid, (threads) => {

        /* -----------------------------------------------------------
         * First time receiving threads (hydration phase):
         *   - Record unread counts but DO NOT show any notifications
         *   - Prevents triggering toasts for old messages
         * ----------------------------------------------------------- */
        if (!hydratedRef.current) {

          threads.forEach((thread) => {
            const key = thread.threadId || thread.id;
            if (!key) return;
            previousUnreadRef.current[key] = getUnreadCount(thread, user.uid);
          });

          hydratedRef.current = true;
          return;
        }



        /* -----------------------------------------------------------
         * For every live update:
         *   - Compare unread count with previous unread count
         *   - If increased AND message is new → show toast
         * ----------------------------------------------------------- */
        threads.forEach((thread) => {

          const key = thread.threadId || thread.id;
          if (!key) return;

          const unread = getUnreadCount(thread, user.uid);
          const previous = previousUnreadRef.current[key] ?? 0;

          const lastMessageTimestamp = thread.timestamp?.toMillis?.();



          // Conditions for showing a toast:
          //   1. unread increased
          //   2. thread has a lastMessage string
          //   3. message timestamp ≥ when notifications were last enabled
          if (
              unread > previous &&
              thread.lastMessage &&
              (!lastMessageTimestamp || lastMessageTimestamp >= lastEnabledRef.current)
          ) {
            showToast({
              title: formatTitle(thread),
              message: thread.lastMessage,
            });
          }



          // Update previous unread count for next comparison.
          previousUnreadRef.current[key] = unread;
        });
      });
    });



    /* ====================================================================
     * Cleanup on unmount or when user changes
     * ==================================================================== */
    return () => {
      unsubscribeUser();

      if (unsubscribeThreadsRef.current) {
        unsubscribeThreadsRef.current();
        unsubscribeThreadsRef.current = null;
      }
    };

  }, [showToast, user?.uid]);
}