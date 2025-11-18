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

export default function SettingsScreen() {
  const [search, setSearch] = React.useState('');

  async function handleConfirmLogout() {
    try {
      await signOutUW();
      router.replace('/login');
    } catch (error: any) {
      console.error('Logout failed', error);
      Alert.alert('Logout failed', error?.message ?? 'Something went wrong. Please try again.');
    }
  }

  function logout() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: handleConfirmLogout },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Search */}
      <View style={styles.searchBar}>
        <Feather name="search" size={18} color="#9CA3AF" />
        <TextInput
          placeholder="Search"
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Your account */}
      <Text style={styles.sectionLabel}>Your account</Text>
      <Row
        icon="user"
        title="Account Center"
        subtitle="Password, security, personal details"
        href="/account-center"
        right={<Text style={{ color: '#9CA3AF' }} />}
      />

      {/* How you use BadgerSwap */}
      <Text style={styles.sectionLabel}>How you use BadgerSwap</Text>
      <Row icon="bookmark" title="Saved" onPress={() => Alert.alert('Saved coming soon')} />
      <Row icon="clock" title="Your activity" href="/activity" />
      <Row icon="bell" title="Notifications" onPress={() => Alert.alert('Notifications coming soon')} />

      {/* Who can see your content */}
      <Text style={styles.sectionLabel}>Who can see your content</Text>
      <Row
        icon="lock"
        title="Account privacy"
        right={<Text style={{ color: '#6B7280' }}>Public</Text>}
        onPress={() => Alert.alert('Privacy coming soon')}
      />
      <Row icon="slash" title="Blocked" onPress={() => Alert.alert('Blocked list coming soon')} />

      {/* About */}
      <Text style={styles.sectionLabel}>About</Text>
      <Row icon="info" title="About BadgerSwap" onPress={() => Alert.alert('BadgerSwap v1.0.0')} />

      {/* Login section */}
      <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Login</Text>
      <TouchableOpacity
        style={styles.linkRow}
        onPress={() => Alert.alert('Add account coming soon')}
      >
        <Text style={[styles.linkText, { color: '#2563EB' }]}>Add account</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.linkRow} onPress={logout}>
        <Text style={[styles.linkText, { color: '#DC2626' }]}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { marginLeft: 8, flex: 1, color: '#111827' },
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
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  rowTitle: { color: '#111827', fontWeight: '600' },
  rowSubtitle: { color: '#6B7280', fontSize: 12 },
  linkRow: { paddingHorizontal: 16, paddingVertical: 14 },
  linkText: { fontWeight: '700' },
});
