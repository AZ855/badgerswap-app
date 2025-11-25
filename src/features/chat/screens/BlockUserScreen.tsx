import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useBlockingStatus } from '../../../hooks/useBlockingStatus';
import { COLORS } from '../../../theme/colors';
import { useAuth } from '../../auth/AuthProvider';
import { updateBlockStatus } from '../../profile/blocking';

export default function BlockUserScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string; name?: string }>();
  const targetUserId = typeof params.userId === 'string' ? params.userId : '';
  const displayName = useMemo(() => {
    if (typeof params.name === 'string' && params.name.trim()) return params.name;
    return 'BadgerSwap User';
  }, [params.name]);

  const { user } = useAuth();
  const { isBlocked, blockedByOther, loading } = useBlockingStatus(user?.uid, targetUserId);

  const toggleBlock = async (nextValue: boolean) => {
    if (!user?.uid || !targetUserId) return;
    await updateBlockStatus(user.uid, targetUserId, nextValue);
    if (nextValue) {
      Alert.alert('User blocked', 'You will no longer see this user or exchange messages.');
    }
  };

  const messagingDisabledCopy = blockedByOther
    ? 'You cannot view their profile or send messages.'
    : 'You blocked this user. Both of you cannot view each other or send messages until it is undone.';

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
        <Feather name="chevron-left" size={20} color="#111827" />
        <Text style={styles.backText}>Back to chat</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.subtitle}>Block this user from contacting you</Text>
          </View>
        </View>

        <View style={styles.row}> 
          <View>
            <Text style={styles.rowTitle}>Block {displayName}</Text>
            <Text style={styles.rowSubtitle}>
              When blocked, neither of you can see each other’s profile, listings, or messages.
            </Text>
          </View>
          <Switch
            value={isBlocked}
            onValueChange={toggleBlock}
            disabled={loading || blockedByOther}
            thumbColor={isBlocked ? COLORS.white : '#E5E7EB'}
            trackColor={{ true: COLORS.primary, false: '#E5E7EB' }}
          />
        </View>
      </View>

      {(isBlocked || blockedByOther) && (
        <View style={styles.notice}> 
          <Feather name="slash" size={18} color={COLORS.primary} />
          <Text style={styles.noticeText}>{messagingDisabledCopy}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
    gap: 12,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  backText: {
    marginLeft: 6,
    color: '#111827',
    fontWeight: '600',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 18,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    color: '#6B7280',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  rowSubtitle: {
    color: '#6B7280',
    marginTop: 4,
    maxWidth: '80%',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 10,
  },
  noticeText: {
    flex: 1,
    color: '#1F2937',
  },
});