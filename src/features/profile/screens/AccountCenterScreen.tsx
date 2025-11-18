// src/features/profile/screens/AccountCenterScreen.tsx
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS } from '../../../theme/colors';

type RowProps = {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  subtitle?: string;
  onPress?: () => void;
};

function Row({ icon, title, subtitle, onPress }: RowProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={styles.rowInner}>
        <View style={styles.rowLeft}>
          <Feather name={icon} size={18} color="#111827" />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.rowTitle}>{title}</Text>
            {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
          </View>
        </View>
        <Feather name="chevron-right" size={18} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );
}

export default function AccountCenterScreen() {
  const goToEditProfile = () => {
    router.push('/edit-profile');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={styles.sectionLabel}>Your account</Text>
      <Row
        icon="edit-2"
        title="Edit profile"
        subtitle="Name, photo, and basic info"
        onPress={goToEditProfile}
      />

      <Text style={styles.sectionLabel}>Security</Text>
      <Row
        icon="lock"
        title="Change password"
        subtitle="Update your BadgerSwap password"
        onPress={() => Alert.alert('Change password', 'Coming soon')}
      />
      <Row
        icon="shield"
        title="Login activity"
        subtitle="See recent devices and sessions"
        onPress={() => Alert.alert('Login activity', 'Coming soon')}
      />

      <Text style={styles.sectionLabel}>Personal details</Text>
      <Row
        icon="info"
        title="Personal details"
        subtitle="Email and other contact info"
        onPress={() => Alert.alert('Personal details', 'Coming soon')}
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
    marginTop: 16,
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
});
