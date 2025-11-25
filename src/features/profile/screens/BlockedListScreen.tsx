import { Feather } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db, doc, getDoc } from '../../../lib/firebase';
import { COLORS } from '../../../theme/colors';
import { useAuth } from '../../auth/AuthProvider';
import { subscribeToBlockedUsers, updateBlockStatus } from '../blocking';

interface BlockedUserRowProps {
  userId: string;
  name: string;
  email?: string;
  onUnblock: () => void;
}

function BlockedUserRow({ userId, name, email, onUnblock }: BlockedUserRowProps) {
  const initials = name.slice(0, 1).toUpperCase();
  return (
    <View style={styles.listRow}>
      <View style={styles.listAvatar}>
        <Text style={styles.listAvatarText}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.listName}>{name}</Text>
        {email ? <Text style={styles.listEmail}>{email}</Text> : null}
      </View>
      <TouchableOpacity style={styles.unblockButton} onPress={onUnblock}>
        <Text style={styles.unblockText}>Unblock</Text>
      </TouchableOpacity>
    </View>
  );
}

type BlockedUser = { id: string; name: string; email?: string };

export default function BlockedListScreen() {
  const { user } = useAuth();
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const currentUserId = user?.uid ?? '';
  const blockCount = useMemo(() => blocked.length, [blocked]);

  useEffect(() => {
    if (!currentUserId) return;
    setLoading(true);

    const unsubscribe = subscribeToBlockedUsers(currentUserId, async (ids) => {
      const details = await Promise.all(
        ids.map(async (id) => {
          const snap = await getDoc(doc(db, 'users', id));
          const data = snap.data() as { displayName?: string; email?: string } | undefined;
          return {
            id,
            name: data?.displayName?.trim() || 'BadgerSwap User',
            email: data?.email,
          };
        })
      );
      setBlocked(details);
      setLoading(false);
    });

    return unsubscribe;
  }, [currentUserId]);

  const confirmUnblock = (targetId: string, name: string) => {
    if (!currentUserId) return;
    Alert.alert('Unblock user', `Allow ${name} to view and message you again?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock',
        style: 'destructive',
        onPress: () => updateBlockStatus(currentUserId, targetId, false),
      },
    ]);
  };

  if (!currentUserId) {
    return (
      <View style={styles.centered}> 
        <Text style={styles.header}>Blocked accounts</Text>
        <Text style={styles.empty}>Sign in to manage blocked users.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}> 
        <ActivityIndicator color={COLORS.primary} />
        <Text style={{ marginTop: 8, color: '#111827' }}>Loading blocked users…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}> 
      <Text style={styles.header}>Blocked accounts</Text>
      <Text style={styles.subtitle}>{blockCount} blocked</Text>

      {blocked.length === 0 ? (
        <View style={styles.emptyState}> 
          <Feather name="shield-off" size={48} color="#9CA3AF" />
          <Text style={styles.empty}>You have not blocked anyone.</Text>
          <Text style={styles.emptyHint}>You can block a user from any conversation.</Text>
        </View>
      ) : (
        <FlatList
          data={blocked}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 8 }}
          renderItem={({ item }) => (
            <BlockedUserRow
              userId={item.id}
              name={item.name}
              email={item.email}
              onUnblock={() => confirmUnblock(item.id, item.name)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  header: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 40,
  },
  empty: {
    color: '#111827',
    fontWeight: '600',
    marginTop: 8,
  },
  emptyHint: {
    color: '#6B7280',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  listAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listAvatarText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  listName: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 16,
  },
  listEmail: {
    color: '#6B7280',
    fontSize: 12,
  },
  unblockButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  unblockText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  separator: {
    height: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
});