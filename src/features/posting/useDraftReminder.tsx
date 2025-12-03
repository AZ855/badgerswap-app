import { Feather } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Snackbar } from '../../components/Snackbar';
import { db, doc, onSnapshot } from '../../lib/firebase';
import { useAuth } from '../auth/AuthProvider';
import { loadDraftListing, markDraftReminderShown } from './draftStorage';

const REMINDER_AFTER_MS = 24 * 60 * 60 * 1000; // 24 hours
const REMINDER_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours between nudges

// const REMINDER_AFTER_MS = 10 * 1000; // test: 5 seconds
// const REMINDER_COOLDOWN_MS = 5 * 1000; // test

export function useDraftReminder() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const checkingRef = useRef(false);
  const visibleRef = useRef(false);

  const shouldCheck = useMemo(() => {
    if (!user?.uid) return false;
    if (!remindersEnabled) return false;
    if (pathname?.startsWith('/post-item')) return false;
    return true;
  }, [pathname, remindersEnabled, user?.uid]);

  const hydratePreferences = useCallback(() => {
    if (!user?.uid) return () => {};
    const userRef = doc(db, 'users', user.uid);
    return onSnapshot(
      userRef,
      (snap) => {
        const data = snap.data() as { notificationPreferences?: Record<string, boolean> } | undefined;
        setRemindersEnabled(data?.notificationPreferences?.reminders ?? true);
      },
      (err) => {
        console.error('Failed to read reminder preferences', err);
        setRemindersEnabled(true);
      }
    );
  }, [user?.uid]);

  useEffect(() => {
    const unsubscribe = hydratePreferences();
    return () => {
      unsubscribe?.();
    };
  }, [hydratePreferences]);

  const checkReminder = useCallback(async () => {
    if (!shouldCheck || checkingRef.current || visibleRef.current) return;
    checkingRef.current = true;
    try {
      const draft = user?.uid ? await loadDraftListing(user.uid) : null;
      if (!draft) {
        setVisible(false);
        return;
      }

      const now = Date.now();
      if (now - draft.savedAt < REMINDER_AFTER_MS) {
        setVisible(false);
        return;
      }

      if (draft.lastReminderAt && now - draft.lastReminderAt < REMINDER_COOLDOWN_MS) {
        setVisible(false);
        return;
      }

      setVisible(true);
      if (user?.uid) {
        await markDraftReminderShown(user.uid);
      }
    } catch (err) {
      console.error('Failed to check draft reminder', err);
    } finally {
      checkingRef.current = false;
    }
  }, [shouldCheck, user?.uid]);

  useEffect(() => {
    checkReminder();
  }, [checkReminder]);

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        void checkReminder();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [checkReminder]);

  const handleResume = () => {
    setVisible(false);
    router.push('/post-item');
  };

  const handleDismiss = async () => {
    setVisible(false);
    if (user?.uid) {
      const draft = await loadDraftListing(user.uid);
      if (!draft) return;
      await markDraftReminderShown(user.uid);
    }
  };

  return (
    <Snackbar
      visible={visible}
      text="You have an unfinished listing"
      actionLabel="Continue"
      onAction={handleResume}
      onPress={handleResume}
      onDismiss={handleDismiss}
      bottomOffset={insets.bottom}
      icon={<Feather name="clock" size={18} color="white" />}
    />
  );
}

export function DraftReminderListener() {
  return useDraftReminder();
}