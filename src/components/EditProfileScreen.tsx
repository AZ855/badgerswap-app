// src/features/profile/screens/EditProfileScreen.tsx
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../features/auth/AuthProvider';
import { db, doc, updateDoc, updateProfile } from '../lib/firebase';
import { COLORS } from '../theme/colors';

export default function EditProfileScreen() {
  const { user, loading } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [initialDisplayName, setInitialDisplayName] = useState('');
  const [saving, setSaving] = useState(false);

  // Load the user's current profile info
  useEffect(() => {
    if (user) {
      const name = user.displayName ?? '';
      setDisplayName(name);
      setInitialDisplayName(name);
    }
  }, [user]);

  // Handle saving updated profile info
  const handleSave = async () => {
    if (!user) {
      Alert.alert('Not signed in', 'Please sign in to edit your profile.');
      return;
    }

    const trimmed = displayName.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Please enter a display name.');
      return;
    }

    // If nothing changed, simply go back
    if (trimmed === initialDisplayName) {
      router.back();
      return;
    }

    try {
      setSaving(true);

      // Update Firebase Auth display name
      await updateProfile(user, { displayName: trimmed });

      // Update Firestore user document
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { displayName: trimmed });

      Alert.alert('Profile updated', 'Your changes have been saved.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err?.message ?? 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  // Loading state while auth is initializing
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  // If user is not logged in
  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Please sign in to edit your profile.</Text>
      </View>
    );
  }

  const disabled = saving || displayName.trim() === initialDisplayName;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Edit profile</Text>
        <Text style={styles.subtitle}>
          Update how your name appears to other BadgerSwap users.
        </Text>

        {/* Display name input */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Display name</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            style={styles.input}
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>

        {/* Email is read-only */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <View style={[styles.input, styles.inputDisabled]}>
            <Text style={styles.inputDisabledText}>{user.email}</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => router.back()}
            disabled={saving}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, disabled ? styles.buttonDisabled : styles.primaryButton]}
            onPress={handleSave}
            disabled={disabled}
          >
            {saving ? (
              <ActivityIndicator />
            ) : (
              <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: COLORS.white,
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
  },
  inputDisabledText: {
    color: '#6B7280',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 32,
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buttonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  buttonText: {
    fontWeight: '600',
    color: COLORS.white,
  },
  buttonTextDisabled: {
    color: '#9CA3AF',
  },
  secondaryButtonText: {
    color: '#111827',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
  },
});
