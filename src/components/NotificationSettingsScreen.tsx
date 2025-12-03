import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../features/auth/AuthProvider';
import { db, doc, onSnapshot, setDoc } from '../lib/firebase';
import { COLORS } from '../theme/colors';

const DEFAULT_PREFS = {
  messages: true,
  marketplaceActivity: true,
  reminders: true,
  recommendations: false,
};

const OPTIONS: {
  key: keyof typeof DEFAULT_PREFS;
  title: string;
  description: string;
}[] = [
  {
    key: 'messages',
    title: 'Messages',
    description: 'Get notified when you receive a new message or reply.',
  },
  {
    key: 'marketplaceActivity',
    title: 'Marketplace activity',
    description: 'Alerts for saved items that change, and updates to your listings.',
  },
  {
    key: 'reminders',
    title: 'Reminders',
    description: 'Receive nudges about unfinished posts.',
  },
  {
    key: 'recommendations',
    title: 'Recommendations',
    description: 'Get suggestions for featured listings and sellers to follow.',
  },
];

type PreferenceKey = keyof typeof DEFAULT_PREFS;

export default function NotificationSettingsScreen() {
  const { user, loading } = useAuth();
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [initialLoading, setInitialLoading] = useState(true);
  const [pendingKey, setPendingKey] = useState<PreferenceKey | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setInitialLoading(false);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as { notificationPreferences?: Partial<typeof DEFAULT_PREFS> };
          const nextPrefs = { ...DEFAULT_PREFS, ...data.notificationPreferences };
          setPrefs(nextPrefs);
        } else {
          setPrefs(DEFAULT_PREFS);
        }
        setInitialLoading(false);
      },
      (error) => {
        console.error('Failed to load notification preferences', error);
        setInitialLoading(false);
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  const togglePreference = async (key: PreferenceKey, nextValue: boolean) => {
    if (!user) {
      Alert.alert('Not signed in', 'Sign in to manage your notification settings.');
      return;
    }

    const previous = prefs[key];
    const updatedPrefs = { ...prefs, [key]: nextValue };

    setPrefs(updatedPrefs);
    setPendingKey(key);

    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { notificationPreferences: updatedPrefs }, { merge: true });
    } catch (error: any) {
      console.error('Failed to update notification preference', error);
      setPrefs((current) => ({ ...current, [key]: previous }));
      Alert.alert(
        'Could not update notifications',
        error?.message ?? 'Please try again in a moment.'
      );
    } finally {
      setPendingKey(null);
    }
  };

  const headerText = useMemo(() => {
    if (pendingKey) return 'Saving your changes…';
    return 'Choose which alerts you want to receive.';
  }, [pendingKey]);

  if (loading || initialLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <Feather name="bell-off" size={24} color={COLORS.primary} />
        <Text style={styles.errorText}>Sign in to manage your notification settings.</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace('/login')}
        >
          <Text style={styles.primaryButtonText}>Go to login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.subtitle}>{headerText}</Text>
      </View>

      <View style={styles.card}>
        {OPTIONS.map((option, index) => {
          const value = prefs[option.key];
          const disabled = pendingKey === option.key;
          return (
            <View
              key={option.key}
              style={[styles.option, index > 0 && styles.optionDivider]}
            >
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              <Switch
                value={value}
                onValueChange={(next) => togglePreference(option.key, next)}
                disabled={disabled}
                thumbColor={value ? COLORS.white : '#E5E7EB'}
                trackColor={{ true: COLORS.primary, false: '#E5E7EB' }}
              />
            </View>
          );
        })}
      </View>

      <View style={styles.infoRow}>
        <Feather name="info" size={18} color={COLORS.primary} />
        <Text style={styles.infoText}>
          BadgerSwap respects your choices. Turning notifications off here stops alerts from us,
          but your system settings control whether notifications are allowed on your device.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    gap: 12,
  },
  errorText: {
    textAlign: 'center',
    color: '#111827',
    marginBottom: 4,
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    color: '#4B5563',
    lineHeight: 20,
  },
  card: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  optionDivider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  optionTextWrap: {
    flex: 1,
    paddingRight: 12,
    gap: 4,
  },
  optionTitle: {
    color: '#111827',
    fontWeight: '700',
  },
  optionDescription: {
    color: '#6B7280',
    lineHeight: 18,
  },
  infoRow: {
    marginTop: 16,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#EFF6FF',
    flexDirection: 'row',
    gap: 8,
  },
  infoText: {
    flex: 1,
    color: '#1F2937',
    lineHeight: 18,
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontWeight: '700',
  },
});