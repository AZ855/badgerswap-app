// app/settings.tsx
import { Feather } from '@expo/vector-icons';
import { Link, router, type Href } from 'expo-router';
import React from 'react';
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
import { COLORS } from '../src/theme/colors';

// ----------------------
// Row Component
// ----------------------
type RowProps = {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  subtitle?: string;
  href?: Href;
  onPress?: () => void;
  right?: React.ReactNode;
};

function Row({ icon, title, subtitle, href, onPress, right }: RowProps) {
  const content = (
    <View style={styles.rowInner}>
      <View style={styles.rowLeft}>
        <Feather name={icon} size={20} color="#111827" />
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
      <Link href={href} asChild>
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

// ----------------------
// Settings Screen
// ----------------------
export default function SettingsScreen() {
  const [search, setSearch] = React.useState('');

  async function handleLogout() {
    try {
      await signOutUW();
      router.replace('/login');
    } catch (err: any) {
      Alert.alert('Logout failed', err?.message ?? 'Please try again.');
    }
  }

  return (
    <ScrollView style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Feather name="search" size={16} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search settings"
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Account section */}
      <Text style={styles.sectionLabel}>ACCOUNT</Text>
      <Row
        icon="user"
        title="Edit profile"
        subtitle="Name, photo, bio"
        href="/edit-profile"
      />
      <Row
        icon="shield"
        title="Privacy"
        subtitle="Profile visibility"
        onPress={() => Alert.alert('Coming soon')}
      />

      {/* App section */}
      <Text style={styles.sectionLabel}>APP</Text>
      <Row
        icon="bell"
        title="Notifications"
        subtitle="Push & email alerts"
        onPress={() => Alert.alert('Coming soon')}
      />

      <Row
        icon="info"
        title="About BadgerSwap"
        subtitle="Version 1.0"
        onPress={() => Alert.alert('BadgerSwap', 'A marketplace for UW students.')}
      />

      {/* Session section */}
      <Text style={styles.sectionLabel}>SESSION</Text>
      <TouchableOpacity style={styles.linkRow} onPress={handleLogout}>
        <Text style={[styles.linkText, { color: '#DC2626' }]}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ----------------------
// Styles
// ----------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    marginLeft: 8,
    flex: 1,
    color: '#111827',
  },
  sectionLabel: {
    marginTop: 20,
    marginBottom: 8,
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowTitle: {
    fontSize: 15,
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
