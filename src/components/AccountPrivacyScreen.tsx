// src/components/AccountPrivacyScreen.tsx
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../features/auth/AuthProvider';
import { db, doc, onSnapshot, setDoc } from '../lib/firebase';
import { COLORS } from '../theme/colors';

type PrivacyChoice = 'public' | 'private';

const OPTIONS: { key: PrivacyChoice; title: string; description: string }[] = [
  {
    key: 'public',
    title: 'Public',
    description: 'Your profile details and listings are visible to other users.',
  },
  {
    key: 'private',
    title: 'Private',
    description: 'Hide your profile details and listings from other users.',
  },
];

export function AccountPrivacyScreen() {
  const { user, loading } = useAuth();
  const [choice, setChoice] = useState<PrivacyChoice>('public');
  const [saving, setSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

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
          const data = snap.data() as { isPrivate?: boolean };
          setChoice(data.isPrivate ? 'private' : 'public');
        } else {
          setChoice('public');
        }
        setInitialLoading(false);
      },
      (err) => {
        console.error('Failed to load privacy preference', err);
        setInitialLoading(false);
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  const selectedDescription = useMemo(
    () => OPTIONS.find((o) => o.key === choice)?.description,
    [choice]
  );

  const updatePrivacy = async (next: PrivacyChoice) => {
    if (!user) {
      Alert.alert('Not signed in', 'Please sign in to update your privacy settings.');
      return;
    }
    if (next === choice && !initialLoading) return;

    try {
      setSaving(true);
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { isPrivate: next === 'private' }, { merge: true });
      setChoice(next);
    } catch (error: any) {
      console.error('Failed to update privacy', error);
      Alert.alert(
        'Could not update privacy',
        error?.message ?? 'Please try again in a moment.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading || initialLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Sign in to manage your privacy settings.</Text>
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
        <Text style={styles.title}>Account privacy</Text>
        <Text style={styles.subtitle}>
          Decide whether other BadgerSwap users can view your profile details and listings.
        </Text>
      </View>

      <View style={styles.card}>
        {OPTIONS.map((option, index) => {
          const isSelected = option.key === choice;
          return (
            <TouchableOpacity
              key={option.key}
              style={[styles.option, index > 0 && styles.optionDivider]}
              onPress={() => updatePrivacy(option.key)}
              disabled={saving}
            >
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              {isSelected ? (
                <View style={styles.checkCircle}>
                  {saving ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Feather name="check" size={16} color={COLORS.white} />
                  )}
                </View>
              ) : (
                <View style={styles.circle} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedDescription ? (
        <Text style={styles.helperText}>
          {choice === 'private'
            ? 'Your phone, listings, and other profile details will be hidden while private.'
            : 'Other users can view your profile and listings while your account is public.'}
        </Text>
      ) : null}
    </ScrollView>
  );
}

export default AccountPrivacyScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
  },
  errorText: {
    textAlign: 'center',
    color: '#111827',
    marginBottom: 12,
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
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
  },
  optionDivider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  optionTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  optionTitle: {
    color: '#111827',
    fontWeight: '700',
    marginBottom: 4,
  },
  optionDescription: {
    color: '#6B7280',
    lineHeight: 18,
  },
  circle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: {
    marginTop: 12,
    marginHorizontal: 16,
    color: '#4B5563',
    lineHeight: 20,
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