import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useBlockingStatus } from '../../../hooks/useBlockingStatus';
import {
    collection,
    db,
    doc,
    onSnapshot,
    query,
    where,
} from '../../../lib/firebase';
import { COLORS } from '../../../theme/colors';
import { useAuth } from '../../auth/AuthProvider';
import ItemListCard from '../../marketplace/components/ItemListCard';
import type { Item } from '../../marketplace/types';
import { mapListingFromDoc } from '../../marketplace/useListings';
import ProfileHeader from '../components/ProfileHeader';

type ProfileDoc = {
  displayName?: string;
  photoURL?: string | null;
  phoneNumber?: string | null;
  phone?: string | null;
  email?: string;
  isPrivate?: boolean;
};

export default function PublicProfileScreen() {
  const params = useLocalSearchParams<{ userId?: string }>();
  const sellerId = typeof params.userId === 'string' ? params.userId : '';
  const { user } = useAuth();
  const { isBlocked, blockedByOther, loading: blockLoading } = useBlockingStatus(user?.uid, sellerId);

  const [profile, setProfile] = useState<ProfileDoc | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [listings, setListings] = useState<Item[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);

  const isSelf = user?.uid === sellerId;
  const isBlockedView = !isSelf && (isBlocked || blockedByOther);
  const hideDetails = isBlockedView || (!isSelf && Boolean(profile?.isPrivate));

  const username = useMemo(() => {
    const email = profile?.email ?? '';
    if (!email) return 'badgerswap';
    const handle = email.split('@')[0];
    return handle || 'badgerswap';
  }, [profile?.email]);

  const displayName = profile?.displayName?.trim() || 'BadgerSwap User';
  const uwVerified = (profile?.email ?? '').toLowerCase().endsWith('@wisc.edu');

  useEffect(() => {
    if (!sellerId) {
      setProfile(null);
      setProfileLoading(false);
      setProfileError('Seller not found.');
      return;
    }

    setProfileLoading(true);
    const ref = doc(db, 'users', sellerId);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setProfile(null);
          setProfileError('Seller not found.');
        } else {
          const data = snap.data() as ProfileDoc;
          const phoneNumber = (data.phoneNumber ?? data.phone ?? '')?.trim();
          setProfile({ ...data, phoneNumber: phoneNumber || null });
          setProfileError(null);
        }
        setProfileLoading(false);
      },
      (err) => {
        console.error('Failed to load profile', err);
        setProfileError(err?.message ?? 'Failed to load profile.');
        setProfileLoading(false);
      }
    );

    return unsubscribe;
  }, [sellerId]);

  useEffect(() => {
    if (!sellerId || hideDetails) {
      setListings([]);
      setListingsLoading(false);
      return;
    }

    setListingsLoading(true);
    const listingsQuery = query(
      collection(db, 'listings'),
      where('sellerId', '==', sellerId)
    );

    const unsubscribe = onSnapshot(
      listingsQuery,
      (snap) => {
        const items = snap.docs.map((docSnap) => {
          type ListingDocData = Parameters<typeof mapListingFromDoc>[1];
          const data = docSnap.data() as ListingDocData;
          return mapListingFromDoc(docSnap.id, data);
        });
        setListings(items);
        setListingsLoading(false);
      },
      (err) => {
        console.error('Failed to load seller listings', err);
        setListings([]);
        setListingsLoading(false);
      }
    );

    return unsubscribe;
  }, [sellerId, hideDetails]);

  if (blockLoading || profileLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (isBlockedView) {
    return (
      <View style={styles.centered}>
        <Feather name="slash" size={24} color={COLORS.primary} />
        <Text style={styles.errorText}>Profile unavailable</Text>
        <Text style={{ color: '#6B7280', textAlign: 'center' }}>
          {isBlocked
            ? 'You blocked this user. Unblock them from Settings to view their profile.'
            : 'This user has blocked you. You cannot view their profile or listings.'}
        </Text>
      </View>
    );
  }
  
  if (profileError) {
    return (
      <View style={styles.centered}>
        <Feather name="alert-circle" size={24} color={COLORS.primary} />
        <Text style={styles.errorText}>{profileError}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentInsetAdjustmentBehavior="automatic">
      <ProfileHeader
        username={username}
        name={displayName}
        uwVerified={uwVerified}
        stats={{ listings: hideDetails ? 0 : listings.length, sold: 0, favorites: 0 }}
        showStats={!hideDetails}
        showHandle={false}
        phoneNumber={hideDetails ? null : profile?.phoneNumber ?? null}
        photoURL={profile?.photoURL ?? null}
        variant="full"
      />

      {hideDetails && (
        <View style={styles.notice}>
          <Feather name="lock" size={16} color={COLORS.primary} />
          <Text style={styles.noticeText}>
            This account is private. Listings and contact details are hidden.
          </Text>
        </View>
      )}

      {!hideDetails && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Listings</Text>
          {listingsLoading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 12 }} />
          ) : listings.length === 0 ? (
            <Text style={styles.empty}>No listings yet.</Text>
          ) : (
            <View style={styles.listingGrid}>
              {listings.map((item) => (
                <View key={item.id} style={{ width: '100%' }}>
                  <ItemListCard item={item} />
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    padding: 24,
    gap: 8,
  },
  errorText: { color: '#374151', marginTop: 6, fontWeight: '600' },
  notice: {
    margin: 16,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noticeText: { color: '#92400E', flex: 1, fontWeight: '600' },
  section: { paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  empty: { color: '#6B7280' },
  listingGrid: { gap: 12, marginTop: 4 },
});