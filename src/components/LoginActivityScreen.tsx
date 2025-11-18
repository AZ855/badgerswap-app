// src/features/profile/screens/LoginActivityScreen.tsx
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../features/auth/AuthProvider';
import { COLORS } from '../theme/colors';

type ActivityItem = {
  id: string;
  device: string;
  location: string;
  time: string;
  current?: boolean;
};

const MOCK_ACTIVITY: ActivityItem[] = [
  {
    id: '1',
    device: 'iPhone 15 · BadgerSwap App',
    location: 'Madison, WI, United States',
    time: 'Just now (current session)',
    current: true,
  },
  {
    id: '2',
    device: 'MacBook Pro · Chrome',
    location: 'Madison, WI, United States',
    time: 'Yesterday at 8:14 PM',
  },
  {
    id: '3',
    device: 'iPad · Safari',
    location: 'Madison, WI, United States',
    time: '2 days ago',
  },
];

export default function LoginActivityScreen() {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login activity</Text>
      <Text style={styles.subtitle}>
        See recent places where you are logged in to BadgerSwap.
      </Text>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryLabel}>Account</Text>
        <Text style={styles.summaryValue}>{user?.email ?? 'Unknown user'}</Text>
      </View>

      <FlatList
        data={MOCK_ACTIVITY}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.device}</Text>
            <Text style={styles.cardLine}>{item.location}</Text>
            <Text style={styles.cardLine}>{item.time}</Text>
            {item.current ? <Text style={styles.currentTag}>Current session</Text> : null}
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  summaryBox: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  card: {
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  cardLine: {
    fontSize: 13,
    color: '#4B5563',
  },
  currentTag: {
    marginTop: 6,
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
});
