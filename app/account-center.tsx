// app/account-center.tsx
import { Feather } from '@expo/vector-icons';
import { Link, type Href } from 'expo-router';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS } from '../src/theme/colors';

type RowProps = {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  subtitle?: string;
  href: Href;
};

function Row({ icon, title, subtitle, href }: RowProps) {
  return (
    <Link href={href} asChild>
      <TouchableOpacity style={styles.row}>
        <View style={styles.rowLeft}>
          <Feather name={icon} size={18} color="#111827" />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.rowTitle}>{title}</Text>
            {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
          </View>
        </View>
        <Feather name="chevron-right" size={18} color="#9CA3AF" />
      </TouchableOpacity>
    </Link>
  );
}

export default function AccountCenterScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Your account</Text>

      <Row
        icon="user"
        title="View profile"
        subtitle="See how others see your profile"
        href="/profile"
      />

      <Row
        icon="edit-3"
        title="Edit profile"
        subtitle="Update your name and contact info"
        href="/edit-profile"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  sectionLabel: {
    marginHorizontal: 16,
    marginBottom: 6,
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
