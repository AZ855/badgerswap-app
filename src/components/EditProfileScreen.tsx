// src/components/EditProfileScreen.tsx
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
import { db, doc, getDoc, updateDoc, updateProfile } from '../lib/firebase';
import { COLORS } from '../theme/colors';

export default function EditProfileScreen() {
  const { user, loading } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [initialDisplayName, setInitialDisplayName] = useState('');

  const [phone, setPhone] = useState('');
  const [initialPhone, setInitialPhone] = useState('');

  const [saving, setSaving] = useState(false);

  // Load current profile data (name from auth, phone from Firestore)
  useEffect(() => {
    if (!user) return;

    const name = user.displayName ?? '';
    setDisplayName(name);
    setInitialDisplayName(name);

    const loadProfile = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data() as any;
          if (typeof data.phone === 'string') {
            setPhone(data.phone);
            setInitialPhone(data.phone);
          } else if (typeof data.phoneNumber === 'string') {
            setPhone(data.phoneNumber);
            setInitialPhone(data.phoneNumber);
          } else {
            setPhone('');
            setInitialPhone('');
          }
        } else {
          setPhone('');
          setInitialPhone('');
        }
      } catch (e) {
        console.warn('Failed to load profile document', e);
      }
    };

    loadProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Not signed in', 'Please sign in to edit your profile.');
      return;
    }

    const trimmedName = displayName.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      Alert.alert('Name required', 'Please enter a display name.');
      return;
    }

    const noChanges =
      trimmedName === initialDisplayName &&
      trimmedPhone === initialPhone;

    if (noChanges) {
      router.back();
      return;
    }

    try {
      setSaving(true);

      // Update Firebase Auth displayName
      if (trimmedName !== initialDisplayName) {
        await updateProfile(user, { displayName: trimmedName });
      }

      // Update Firestore user document
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: trimmedName,
        phone: trimmedPhone || null, // 空字符串就写 null
      });

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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Please sign in to edit your profile.</Text>
      </View>
    );
  }

  const disabled =
    saving ||
    (displayName.trim() === initialDisplayName &&
      phone.trim() === initialPhone);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Edit profile</Text>
        <Text style={styles.subtitle}>
          Update how your information appears to other BadgerSwap users.
        </Text>

        {/* Display name */}
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

        {/* Phone number */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Phone number</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Optional phone number"
            keyboardType="phone-pad"
            style={styles.input}
          />
        </View>

        {/* Email (read-only) */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <View style={[styles.input, styles.inputDisabled]}>
            <Text style={styles.inputDisabledText}>{user.email}</Text>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => router.back()}
            disabled={saving}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              disabled ? styles.buttonDisabled : styles.primaryButton,
            ]}
            onPress={handleSave}
            disabled={disabled}
          >
            {saving ? (
              <ActivityIndicator />
            ) : (
              <Text
                style={[
                  styles.buttonText,
                  disabled && styles.buttonTextDisabled,
                ]}
              >
                Save
              </Text>
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
    gap: 12,
    marginTop: 8,
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
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buttonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  buttonText: {
    fontWeight: '700',
    color: COLORS.white,
  },
  secondaryButtonText: {
    color: '#111827',
  },
  buttonTextDisabled: {
    color: '#9CA3AF',
  },
  errorText: {
    color: '#DC2626',
  },
});
