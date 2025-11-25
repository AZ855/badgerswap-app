// app/settings.tsx
import { Feather } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { signOutUW } from '../src/features/auth/api';
import { useAuth } from '../src/features/auth/AuthProvider';
import { db, doc, onSnapshot } from '../src/lib/firebase';
import { COLORS } from '../src/theme/colors';

type RowProps = {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  subtitle?: string;
  href?: string;
  onPress?: () => void;
  right?: React.ReactNode;
};

// Tiny helper row keeps the screen markup tidy
function Row({ icon, title, subtitle, href, onPress, right }: RowProps) {
  const content = (
    <View style={styles.rowInner}>
      <View style={styles.rowLeft}>
        <Feather name={icon} size={18} color="#111827" />
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.rowTitle}>{title}</Text>
          {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {right ?? <Feather name="chevron-right" size={18} color="#9CA3AF" />}
    </View>
  );

  if (href) {
    return (
      <Link href={href as any} asChild>
        <TouchableOpacity style={styles.row}>{content}</TouchableOpacity>
      </Link>
    );
  }

  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      {content}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {

  const { user } = useAuth();
  const [isPrivate, setIsPrivate] = useState(false);
  const [notificationSummary, setNotificationSummary] = useState('On');

  useEffect(() => {
    if (!user?.uid) {
      setIsPrivate(false);
      setNotificationSummary('On');
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as {
            isPrivate?: boolean;
            notificationPreferences?: Record<string, boolean>;
          };
          setIsPrivate(Boolean(data.isPrivate));
          const prefs = data.notificationPreferences;
          if (prefs && Object.keys(prefs).length > 0) {
            const enabled = Object.values(prefs).some((value) => value !== false);
            setNotificationSummary(enabled ? 'On' : 'Off');
          } else {
            setNotificationSummary('On');
          }
        } else {
          setIsPrivate(false);
          setNotificationSummary('On');
        }
      },
      (error) => {
        console.warn('Failed to read settings', error);
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  // Shared logout alert path so we don't duplicate logic elsewhere
  const handleConfirmLogout = async () => {
    try {
      await signOutUW();
      router.replace('/login');
    } catch (error: any) {
      console.error('Logout failed', error);
      Alert.alert(
        'Logout failed',
        error?.message ?? 'Something went wrong. Please try again.'
      );
    }
  };

  const logout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: handleConfirmLogout },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Search */}
      <View style={styles.searchBar}>
        <Feather name="search" size={18} color="#9CA3AF" />
        <TextInput
          placeholder="Search"
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
        />
      </View>

      {/* Your account */}
      <Text style={styles.sectionLabel}>Your account</Text>
      <Row
        icon="user"
        title="Account Center"
        subtitle="Profile, password, and security"
        href="/account-center"
        right={<Text style={{ color: '#9CA3AF' }}> </Text>}
      />

      {/* How you use BadgerSwap */}
      <Text style={styles.sectionLabel}>How you use BadgerSwap</Text>
      <Row icon="clock" title="Your activity" href="/activity" />
      <Row
        icon="bell"
        title="Notifications"
        subtitle="Messages, listings, reminders"
        href="/notifications"
        right={<Text style={{ color: '#9CA3AF' }}>{notificationSummary}</Text>}
      />

      {/* Who can see your content */}
      <Text style={styles.sectionLabel}>Who can see your content</Text>
      <Row
        icon="lock"
        title="Account privacy"
        right={<Text style={{ color: '#9CA3AF' }}>{isPrivate ? 'Private' : 'Public'}</Text>}
        href="/account-privacy"
      />
      <Row
        icon="slash"
        title="Blocked"
        href="/blocked"
      />

      {/* About */}
      <Text style={styles.sectionLabel}>About</Text>
      <Row
        icon="info"
        title="About BadgerSwap"
        onPress={() => Alert.alert('BadgerSwap v1.0.0')}
      />

      {/* Login */}
      <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Login</Text>
      <TouchableOpacity style={styles.linkRow} onPress={logout}>
        <Text style={[styles.linkText, { color: '#DC2626' }]}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    margin: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    marginLeft: 8,
    flex: 1,
    color: '#111827',
  },
  sectionLabel: {
    marginTop: 8,
    marginBottom: 6,
    marginHorizontal: 16,
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
  },
  row: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowTitle: {
    color: '#111827',
    fontWeight: '600',
  },
  rowSubtitle: {
    color: '#6B7280',
    fontSize: 12,
  },
  linkRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  linkText: {
    fontWeight: '700',
  },
});
