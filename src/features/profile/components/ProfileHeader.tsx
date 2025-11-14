import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../../../theme/colors';

export interface ProfileHeaderProps {
  username: string;
  name: string;
  uwVerified?: boolean;
  stats: { listings: number; sold: number; favorites: number };
  onEdit?: () => void;
  showHandle?: boolean;
  variant?: 'full' | 'compact';
  collapseProgress?: Animated.Value; // 0 (full) -> 1 (compact)
}

export default function ProfileHeader({ username, name, uwVerified, stats, onEdit, showHandle = false, variant = 'full', collapseProgress }: ProfileHeaderProps) {
  const p = collapseProgress ?? new Animated.Value(0);
  const avatarScale = p.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] });
  const fadeOut = p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.4, 0] });
  const padBottom = p.interpolate({ inputRange: [0, 1], outputRange: [12, 4] });

  // Measure real heights so the expanded state matches original exactly
  const [badgeH, setBadgeH] = useState<number | null>(null);
  const [statsH, setStatsH] = useState<number | null>(null);
  const [editH, setEditH] = useState<number | null>(null);
  const toMax = (h: number | null) => (h == null ? undefined : p.interpolate({ inputRange: [0, 1], outputRange: [h, 0] }));
  const toSpace = (px: number) => p.interpolate({ inputRange: [0, 1], outputRange: [px, 0] });
  return (
    <Animated.View style={[styles.wrap, { paddingBottom: padBottom }]}>
      {showHandle && <Text style={styles.handle}>@{username}</Text>}
      <View style={styles.row}>
        <Animated.View style={[styles.avatar, { transform: [{ scale: avatarScale }] }]}>
          <Text style={styles.avatarText}>{name.split(' ').map(n => n[0]).join('')}</Text>
        </Animated.View>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{name}</Text>
            {uwVerified && (
              <View style={styles.verified}>
                <Feather name="check" size={12} color={COLORS.white} />
              </View>
            )}
          </View>
          {uwVerified && (
            <Animated.View
              onLayout={(e) => badgeH == null && setBadgeH(e.nativeEvent.layout.height)}
              style={[
                styles.badge,
                { opacity: fadeOut, maxHeight: toMax(badgeH), marginTop: toSpace(4), overflow: 'hidden' },
              ]}
            >
              <Feather name="shield" size={12} color={COLORS.primary} />
              <Text style={styles.badgeText}>Verified UW email</Text>
            </Animated.View>
          )}
        </View>
      </View>
      <Animated.View
        onLayout={(e) => statsH == null && setStatsH(e.nativeEvent.layout.height)}
        style={[styles.statsRow, { opacity: fadeOut, maxHeight: toMax(statsH), marginTop: toSpace(12), overflow: 'hidden' }]}
      >
        <View style={styles.stat}><Text style={styles.statValue}>{stats.listings}</Text><Text style={styles.statLabel}>Listings</Text></View>
        <View style={styles.stat}><Text style={styles.statValue}>{stats.sold}</Text><Text style={styles.statLabel}>Sold</Text></View>
        <View style={styles.stat}><Text style={styles.statValue}>{stats.favorites}</Text><Text style={styles.statLabel}>Favorites</Text></View>
      </Animated.View>
      <Animated.View
        onLayout={(e) => editH == null && setEditH(e.nativeEvent.layout.height)}
        style={{ opacity: fadeOut, maxHeight: toMax(editH), overflow: 'hidden' }}
      >
        <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: COLORS.white, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  handle: { color: '#6B7280', marginBottom: 10, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.white, fontWeight: '700', fontSize: 22 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  name: { fontSize: 18, fontWeight: '700', color: '#111827' },
  verified: { width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  badgeText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', marginTop: 14, backgroundColor: '#F9FAFB', borderRadius: 12, paddingVertical: 10 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#111827' },
  statLabel: { color: '#6B7280', fontSize: 12 },
  editBtn: { marginTop: 12, backgroundColor: COLORS.white, borderWidth: 2, borderColor: COLORS.primary, borderRadius: 24, paddingVertical: 10, alignItems: 'center' },
  editBtnText: { color: COLORS.primary, fontWeight: '700' },
});
