// src/components/AccountCenterScreen.tsx
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../theme/colors';

type RowProps = {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  subtitle?: string;
  onPress: () => void;
};

function Row({ icon, title, subtitle, onPress }: RowProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={styles.rowLeft}>
        <Feather name={icon} size={18} color="#111827" />
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.rowTitle}>{title}</Text>
          {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <Feather name="chevron-right" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

export default function AccountCenterScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={styles.sectionLabel}>Personal Details</Text>

      {/* <Row
        icon="user"
        title="View profile"
        subtitle="See what others can view"
        onPress={() => router.push('/profile')}
      /> */}

      <Row
        icon="edit-2"
        title="Edit profile"
        subtitle="Name, photo, basic info"
        onPress={() => router.push('/edit-profile')}
      />

      <Text style={styles.sectionLabel}>Security</Text>
      <Row
        icon="lock"
        title="Change password"
        subtitle="Update your password"
        onPress={() => router.push('/change-password')}
      />

      <Row
        icon="activity"
        title="Login activity"
        subtitle="Where you're logged in"
        onPress={() => router.push('/login-activity')}
      />

      {/* <Row
        icon="id-card"
        title="Personal details"
        subtitle="Contact info and more"
        onPress={() => router.push('/personal-details')}
      /> */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  sectionLabel: {
    marginTop: 16,
    marginBottom: 6,
    marginHorizontal: 16,
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  row: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
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
});
