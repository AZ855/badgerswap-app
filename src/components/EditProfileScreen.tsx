// src/components/EditProfileScreen.tsx
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [initialPhotoUri, setInitialPhotoUri] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  // Load current profile data (name + phone + photo)
  useEffect(() => {
    if (!user) return;

    const name = user.displayName ?? '';
    setDisplayName(name);
    setInitialDisplayName(name);

    const loadProfile = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);

        let nextPhone = '';
        let nextPhoto: string | null = null;

        if (snap.exists()) {
          const data = snap.data() as any;

          if (typeof data.phone === 'string') {
            nextPhone = data.phone;
          }

          if (typeof data.photoURL === 'string') {
            nextPhoto = data.photoURL;
          }
        }

        // Fallback to auth photoURL if Firestore does not have it yet
        if (!nextPhoto && user.photoURL) {
          nextPhoto = user.photoURL;
        }

        setPhone(nextPhone);
        setInitialPhone(nextPhone);
        setPhotoUri(nextPhoto);
        setInitialPhotoUri(nextPhoto);
      } catch (e) {
        console.warn('Failed to load profile document', e);
      }
    };

    loadProfile();
  }, [user]);

  const handlePickPhoto = async () => {
    if (!user) return;

    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permission required',
        'Please allow access to your photos to change the profile picture.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setPhotoUri(uri);
    }
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Not signed in', 'Please sign in to edit your profile.');
      return;
    }

    const trimmedName = displayName.trim();
    const trimmedPhone = phone.trim();
    const trimmedPhoto = photoUri?.trim() || null;
    const trimmedInitialPhoto = initialPhotoUri?.trim() || null;

    if (!trimmedName) {
      Alert.alert('Name required', 'Please enter a display name.');
      return;
    }

    const noChanges =
      trimmedName === initialDisplayName &&
      trimmedPhone === initialPhone &&
      trimmedPhoto === trimmedInitialPhoto;

    if (noChanges) {
      router.back();
      return;
    }

    try {
      setSaving(true);

      // Update Firebase Auth profile (name + photo)
      const authUpdates: { displayName?: string; photoURL?: string | null } =
        {};
      if (trimmedName !== initialDisplayName) {
        authUpdates.displayName = trimmedName;
      }
      if (trimmedPhoto !== trimmedInitialPhoto) {
        authUpdates.photoURL = trimmedPhoto;
      }
      if (Object.keys(authUpdates).length > 0) {
        await updateProfile(user, authUpdates);
      }

      // Update Firestore user document
      const userRef = doc(db, 'users', user.uid);
      const updateData: any = {
        displayName: trimmedName,
        phone: trimmedPhone || null,
      };
      if (trimmedPhoto !== trimmedInitialPhoto) {
        updateData.photoURL = trimmedPhoto;
      }
      await updateDoc(userRef, updateData);

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
        <Text style={styles.errorText}>
          Please sign in to edit your profile.
        </Text>
      </View>
    );
  }

  const disabled =
    saving ||
    (displayName.trim() === initialDisplayName &&
      phone.trim() === initialPhone &&
      (photoUri?.trim() || null) === (initialPhotoUri?.trim() || null));

  // Simple initials fallback for the photo placeholder
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('') || 'BS';

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

        {/* Photo section */}
        <View style={styles.photoSection}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Text style={styles.photoPlaceholderText}>{initials}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.photoButton}
            onPress={handlePickPhoto}
            disabled={saving}
          >
            <Text style={styles.photoButtonText}>Change photo</Text>
          </TouchableOpacity>
        </View>

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

  // photo area
  photoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primary,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: '700',
  },
  photoButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  photoButtonText: {
    fontWeight: '600',
    color: COLORS.primary,
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
