// src/components/ChangePasswordScreen.tsx
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
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
import {
    EmailAuthProvider,
    addDoc,
    collection,
    db,
    reauthenticateWithCredential,
    serverTimestamp,
    updatePassword,
} from '../lib/firebase';
import { COLORS } from '../theme/colors';

export default function ChangePasswordScreen() {
  const { user, loading } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const disabled = useMemo(() => {
    return (
      saving ||
      !currentPassword.trim() ||
      !newPassword.trim() ||
      !confirmPassword.trim()
    );
  }, [confirmPassword, currentPassword, newPassword, saving]);

  const handleChangePassword = async () => {
    if (!user) {
      Alert.alert('Not signed in', 'Please sign in to change your password.');
      return;
    }

    if (!user.email) {
      Alert.alert('Missing email', 'This account does not have an email address.');
      return;
    }

    if (newPassword.trim().length < 6) {
      Alert.alert('Password too short', 'New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Please confirm your new password.');
      return;
    }

    try {
      setSaving(true);

      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      await updatePassword(user, newPassword);

      // Log the password change event to Firestore for auditing (best effort)
      try {
        await addDoc(collection(db, 'securityEvents'), {
          userId: user.uid,
          type: 'password_change',
          createdAt: serverTimestamp(),
        });
      } catch (logError) {
        console.warn('Password updated, but failed to log security event', logError);
      }

      Alert.alert('Password updated', 'Your password has been changed.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Failed to change password', err);

      let message = err?.message ?? 'Failed to change password.';
      if (err?.code === 'auth/invalid-credential' || err?.code === 'auth/wrong-password') {
        message = 'The current password you entered is incorrect. Please try again.';
      }

      Alert.alert('Error', message);
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
        <Text style={styles.errorText}>Please sign in to change your password.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Change password</Text>
        <Text style={styles.subtitle}>
          Secure your BadgerSwap account by setting a strong, unique password.
        </Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Current password</Text>
          <TextInput
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Enter your current password"
            secureTextEntry
            style={styles.input}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>New password</Text>
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Choose a new password"
            secureTextEntry
            style={styles.input}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Confirm new password</Text>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter your new password"
            secureTextEntry
            style={styles.input}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => router.back()}
            disabled={saving}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              disabled ? styles.buttonDisabled : styles.primaryButton,
            ]}
            onPress={handleChangePassword}
            disabled={disabled}
          >
            {saving ? (
              <ActivityIndicator />
            ) : (
              <Text
                style={[styles.buttonText, disabled && styles.buttonTextDisabled]}
              >
                Update password
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