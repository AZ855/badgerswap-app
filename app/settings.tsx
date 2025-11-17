// app/settings.tsx
import { Feather } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
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

type RowProps = {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  subtitle?: string;
  href?: string;
  onPress?: () => void;
  right?: React.ReactNode;
};

// Generic settings row component
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

  // Link row if href is provided
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
  const [search, setSearch] = useState('');

  // Confirm logout
  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOutUW();
            router.replace('/login');
          } catch (err: any) {
            Alert.alert('Logout failed', err?.message ?? 'Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Feather name="search" size={16} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search settings"
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Profile section */}
      <Text style={styles.sectionLabel}>ACCOUNT</Text>
      <Row icon="user" title="View profile" href="/profile" />
      <Row icon="edit-3" title="Edit profile" href="/edit-profile" />

      {/* App section */}
      <Text style={styles.sectionLabel}>APP</Text>
      <Row icon="bell" title="Notifications" onPress={() => Alert.alert('Coming soon')} />
      <Row icon="info" title="About BadgerSwap" onPress={() => Alert.alert('Coming soon')} />

      {/* Session section */}
      <Text style={styles.sectionLabel}>SESSION</Text>
      <TouchableOpacity style={styles.linkRow} onPress={handleLogout}>
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
    borderRadius: 10,
    margin: 16,
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
