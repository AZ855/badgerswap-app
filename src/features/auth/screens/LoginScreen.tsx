import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ImageSourcePropType,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS } from '../../../theme/colors';
import { sendUWPasswordReset, signInUW } from '../api';

const UW_EMAIL_RE = /^[a-z0-9._%+-]+@wisc\.edu$/i;
const LOGO: ImageSourcePropType = require('../../../../assets/images/BadgerSwap_Logo.png');

export default function LoginScreen() {
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [resetting, setResetting] = useState(false);

  const emailError = useMemo(() => {
    const value = email.trim().toLowerCase();
    if (!value) return 'Email is required';
    if (!UW_EMAIL_RE.test(value)) return 'Please use your UW-Madison email (@wisc.edu)';
    return '';
  }, [email]);

  const passwordError = useMemo(() => {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    return '';
  }, [password]);

  const isValid = !emailError && !passwordError;

  const handleLogin = async () => {
    if (!emailTouched) setEmailTouched(true);
    if (!passwordTouched) setPasswordTouched(true);

    if (!isValid) {
      Alert.alert('Invalid credentials', 'Please fix the fields highlighted in red.');
      return;
    }

    setSubmitting(true);
    try {
      await signInUW(email, password);
      router.replace('/marketplace');
    } catch (err: any) {
      console.error('Login error', err);
      let message = err?.message ?? 'Failed to log in. Please try again.';
      if (err?.code === 'auth/invalid-credential') {
        message = 'Incorrect email or password.';
      }
      Alert.alert('Login failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!emailTouched) setEmailTouched(true);

    if (emailError) {
      Alert.alert('Enter your UW email', emailError);
      return;
    }

    setResetting(true);
    try {
      await sendUWPasswordReset(email);
      Alert.alert(
        'Reset email sent',
        'Check your UW–Madison inbox for instructions to reset your password.'
      );
    } catch (err: any) {
      console.error('Password reset error', err);
      let message = err?.message ?? 'Unable to send reset email. Please try again.';
      if (err?.code === 'auth/user-not-found') {
        message = 'No account found with that email address.';
      }
      Alert.alert('Reset failed', message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.inner}>
        <View style={styles.logoBox}>
          <Image
            source={LOGO}
            style={styles.logoImage}
            accessibilityRole="image"
            accessibilityLabel="BadgerSwap logo"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            testID="emailInput"
            style={[styles.input, (emailTouched && emailError) ? styles.inputError : null]}
            placeholder="your.name@wisc.edu"
            value={email}
            onChangeText={(t) => setEmail(t)}
            onBlur={() => setEmailTouched(true)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="next"
          />
          {(emailTouched && emailError) ? (
            <Text style={styles.errorText}>{emailError}</Text>
          ) : null}

          <Text style={styles.label}>Password</Text>
          <TextInput
            testID="passwordInput"
            style={[styles.input, (passwordTouched && passwordError) ? styles.inputError : null]}
            placeholder="••••••••"
            value={password}
            onChangeText={(t) => setPassword(t)}
            onBlur={() => setPasswordTouched(true)}
            secureTextEntry
            autoComplete="password"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />
          {(passwordTouched && passwordError) ? (
            <Text style={styles.errorText}>{passwordError}</Text>
          ) : null}

          <TouchableOpacity
            testID="loginButton"
            style={[styles.primaryBtn, (!isValid || submitting) ? styles.primaryBtnDisabled : null]}
            onPress={handleLogin}
            disabled={!isValid || submitting}
          >
            <Text style={styles.primaryBtnText}>
              {submitting ? 'Logging in…' : 'Login with UW Email'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={styles.linkText}>No account? Create one</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleForgotPassword}
            disabled={resetting}
            style={styles.forgotLink}
          >
            <Text style={[styles.linkText, styles.forgotText]}>
              {resetting ? 'Sending reset email…' : 'Forgot password?'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logoBox: {
    alignSelf: 'center',
    marginBottom: 32,
  },
  logoImage: {
    width: 180,
    height: 70,
    resizeMode: 'contain',
  },
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
  label: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
  },
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
  inputError: {
    borderColor: '#d32f2f',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: { color: '#000000', fontSize: 16, fontWeight: '700' },
  linkText: {
    textAlign: 'center',
    color: COLORS.secondary,
    marginTop: 14,
    fontSize: 14,
  },
  forgotLink: {
    alignSelf: 'center',
  },
  forgotText: {
    marginTop: 10,
  },
});
