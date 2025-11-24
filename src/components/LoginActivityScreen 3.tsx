// src/components/LoginActivityScreen.tsx
import React, { useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../features/auth/AuthProvider';
import { useLoginActivity } from '../features/auth/loginActivity';
import { COLORS } from '../theme/colors';


export default function LoginActivityScreen() {
  const { user } = useAuth();

  const { entries, loading, error } = useLoginActivity(user?.uid);

  const emptyMessage = useMemo(() => {
    if (error) return 'Unable to load login activity right now.';
    return 'No login activity recorded yet.';
  }, [error]);

  const data = useMemo(() => entries, [entries]);

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Please sign in to view login activity.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login activity</Text>
      <Text style={styles.subtitle}>
        See recent logins to your BadgerSwap account.
      </Text>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryLabel}>Account</Text>
        <Text style={styles.summaryValue}>{user?.email ?? 'Unknown user'}</Text>
      </View>

      <FlatList
        data={data}
        refreshing={loading}
        onRefresh={() => {}}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              {loading ? <ActivityIndicator /> : <Text style={styles.emptyText}>{emptyMessage}</Text>}
            </View>
          )}
          renderItem={({ item, index }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.device}</Text>
            <Text style={styles.cardLine}>{formatTimestamp(item.createdAt)}</Text>
            {index === 0 && !loading ? <Text style={styles.currentTag}>Current session</Text> : null}
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
    </View>
  );
}

function formatTimestamp(value: Date | null) {
    if (!value) return 'Unknown time';
    return value.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
  },
});
