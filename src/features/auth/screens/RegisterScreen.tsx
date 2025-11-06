import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS } from '../../../theme/colors';

const UW_EMAIL_RE = /^[a-z0-9._%+-]+@wisc\.edu$/i;

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);

  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);

  const [password, setPassword] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);

  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmTouched, setConfirmTouched] = useState(false);

  // --- field-level errors ---
  const nameError = useMemo(() => {
    const v = name.trim();
    if (!v) return 'Name is required';
    if (v.length < 2) return 'Name must be at least 2 characters';
    return '';
  }, [name]);

  const emailError = useMemo(() => {
    const v = email.trim().toLowerCase();
    if (!v) return 'Email is required';
    if (!UW_EMAIL_RE.test(v)) return 'Please use your UW-Madison email (@wisc.edu)';
    return '';
  }, [email]);

  const passwordError = useMemo(() => {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    return '';
  }, [password]);

  const confirmError = useMemo(() => {
    if (!confirmPassword) return 'Please re-enter your password';
    if (confirmPassword !== password) return 'Passwords do not match';
    return '';
  }, [confirmPassword, password]);

  const isValid = !nameError && !emailError && !passwordError && !confirmError;

  const handleRegister = () => {
    
    if (!nameTouched) setNameTouched(true);
    if (!emailTouched) setEmailTouched(true);
    if (!passwordTouched) setPasswordTouched(true);
    if (!confirmTouched) setConfirmTouched(true);

    if (!isValid) {
      Alert.alert('Invalid fields', 'Please fix the fields highlighted in red.');
      return;
    }

    
    router.replace('/marketplace');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Use your UW email to join BadgerSwap</Text>
        </View>

        <View style={styles.card}>
          {/* Name */}
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            testID="nameInput"
            style={[styles.input, nameTouched && nameError ? styles.inputError : null]}
            placeholder="Your name"
            value={name}
            onChangeText={setName}
            onBlur={() => setNameTouched(true)}
            returnKeyType="next"
          />
          {nameTouched && !!nameError && <Text style={styles.errorText}>{nameError}</Text>}

          {/* Email */}
          <Text style={styles.label}>UW Email</Text>
          <TextInput
            testID="emailInput"
            style={[styles.input, emailTouched && emailError ? styles.inputError : null]}
            placeholder="your.name@wisc.edu"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            onBlur={() => setEmailTouched(true)}
            returnKeyType="next"
          />
          {emailTouched && !!emailError && <Text style={styles.errorText}>{emailError}</Text>}

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <TextInput
            testID="passwordInput"
            style={[styles.input, passwordTouched && passwordError ? styles.inputError : null]}
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onBlur={() => setPasswordTouched(true)}
            returnKeyType="next"
            autoComplete="password-new"
          />
          {passwordTouched && !!passwordError && (
            <Text style={styles.errorText}>{passwordError}</Text>
          )}

          {/* Confirm */}
          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            testID="confirmInput"
            style={[styles.input, confirmTouched && confirmError ? styles.inputError : null]}
            placeholder="••••••••"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            onBlur={() => setConfirmTouched(true)}
            returnKeyType="done"
            onSubmitEditing={handleRegister}
            autoComplete="password-new"
          />
          {confirmTouched && !!confirmError && (
            <Text style={styles.errorText}>{confirmError}</Text>
          )}

          {/* Submit */}
          <TouchableOpacity
            testID="registerButton"
            style={[styles.primaryBtn, !isValid && styles.primaryBtnDisabled]}
            onPress={handleRegister}
            disabled={!isValid}
          >
            <Text style={styles.primaryBtnText}>Create Account</Text>
          </TouchableOpacity>

          {/* Back to Login */}
          <TouchableOpacity onPress={() => router.push('/login')} style={styles.linkWrap}>
            <Text style={styles.linkText}>Already have an account? Log in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  header: { marginBottom: 18, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { marginTop: 6, fontSize: 14, color: COLORS.textSecondary },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  label: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: COLORS.white,
    marginBottom: 4,
  },
  inputError: { borderColor: '#d32f2f' },
  errorText: { color: '#d32f2f', fontSize: 12, marginBottom: 12 },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  linkWrap: { marginTop: 14, alignItems: 'center' },
  linkText: { color: COLORS.secondary, fontSize: 14 },
});
