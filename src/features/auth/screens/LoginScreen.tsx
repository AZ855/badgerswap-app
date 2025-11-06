import { router } from 'expo-router';
import { useMemo, useState } from 'react';
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

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);

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

  const handleLogin = () => {
    
    if (!emailTouched) setEmailTouched(true);
    if (!passwordTouched) setPasswordTouched(true);

    if (!isValid) {
      Alert.alert('Invalid credentials', 'Please fix the fields highlighted in red.');
      return;
    }

    
    router.replace('/marketplace');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.inner}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>BadgerSwap</Text>
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
            style={[styles.primaryBtn, !isValid ? styles.primaryBtnDisabled : null]}
            onPress={handleLogin}
            disabled={!isValid}
          >
            <Text style={styles.primaryBtnText}>
              Login with UW Email
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={styles.linkText}>No account? Create one</Text>
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
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 32,
  },
  logoText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
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
  primaryBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  linkText: {
    textAlign: 'center',
    color: COLORS.secondary,
    marginTop: 14,
    fontSize: 14,
  },
});
