import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { db, doc, onSnapshot } from '../../../lib/firebase';
import { COLORS } from '../../../theme/colors';
import { useAuth } from '../../auth/AuthProvider';
import { getOrCreateThread } from '../../chat/api';
import {
  addFavoriteListing,
  removeFavoriteListing,
  subscribeFavoriteListing,
} from '../../favorites/api';
import type { Item } from '../types';
import { mapListingFromDoc } from '../useListings';

const { width } = Dimensions.get('window');

export default function ItemDetailScreen() {
  const params = useLocalSearchParams<{ itemId?: string }>();
  const itemId = typeof params.itemId === 'string' ? params.itemId : '';
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [item, setItem] = useState<Item | null>(null);
  const [sellerProfile, setSellerProfile] = useState<{
    name?: string;
    photoURL?: string | null;
    verified?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Live Firestore subscription keeps the detail view fresh during edits
  useEffect(() => {
    if (!itemId) {
      setError('Listing not found.');
      setLoading(false);
      return;
    }

    const ref = doc(db, 'listings', itemId);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setItem(null);
          setError('Listing not found.');
        } else {
          type ListingDocData = Parameters<typeof mapListingFromDoc>[1];
          const data = snap.data() as ListingDocData;
          setItem(mapListingFromDoc(snap.id, data));
          setError(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Failed to load listing:', err);
        setError(err?.message ?? 'Failed to load listing.');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [itemId]);

  // Live seller profile (photo + name) so updates propagate to listings
  useEffect(() => {
    if (!item?.sellerId) {
      setSellerProfile(null);
      return;
    }

    const sellerRef = doc(db, 'users', item.sellerId);
    const unsubscribe = onSnapshot(
      sellerRef,
      (snap) => {
        if (!snap.exists()) {
          setSellerProfile(null);
          return;
        }

        const data = snap.data() as any;
        const name =
          typeof data.displayName === 'string' && data.displayName.trim().length > 0
            ? data.displayName.trim()
            : undefined;
        const photoURL =
          typeof data.photoURL === 'string' && data.photoURL.trim().length > 0
            ? data.photoURL.trim()
            : null;

        setSellerProfile({
          name,
          photoURL,
          verified: Boolean(data.verified),
        });
      },
      (err) => {
        console.error('Failed to load seller profile', err);
      }
    );

    return unsubscribe;
  }, [item?.sellerId]);


  // Keep heart state in sync with the user's favorites collection
  useEffect(() => {
    if (
      !user?.uid ||
      !itemId ||
      (item?.sellerId && item?.sellerId === user.uid)
    ) {
      setIsFavorite(false);
      return;
    }
    const unsubscribe = subscribeFavoriteListing(
      user.uid,
      itemId,
      setIsFavorite
    );
    return unsubscribe;
  }, [user?.uid, itemId, item?.sellerId]);

  const images = item?.imageUrls?.length ? item.imageUrls : [null];

  const MAX_NAME_CHARS = 11; // Target length equal to "Johnny Hong"
  const truncateName = (name: string, max: number) =>
    name.length > max ? `${name.slice(0, Math.max(0, max - 3))}...` : name;
  //const resolvedSellerName = item?.seller?.name ?? 'Seller';
  const resolvedSellerName = sellerProfile?.name ?? item?.seller?.name ?? 'Seller';
  const sellerName = truncateName(resolvedSellerName, MAX_NAME_CHARS);
  const sellerPhotoURL = sellerProfile?.photoURL ?? null;
  const sellerVerified = sellerProfile?.verified ?? item?.seller?.verified ?? false;
  const sellerInitials = resolvedSellerName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const isOwnListing = Boolean(user?.uid && item?.sellerId === user.uid);
  const postedDate =
    item?.postedAt != null ? formatTimeAgo(item.postedAt) : 'Just now';

  // Central toggle handler so the UI stays atomic
  const toggleFavorite = async () => {
    if (!item || isOwnListing) return;
    if (!user?.uid) {
      Alert.alert('Sign in required', 'Please log in to save listings.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log in', onPress: () => router.push('/login') },
      ]);
      return;
    }
    setFavoriteBusy(true);
    try {
      if (isFavorite) {
        await removeFavoriteListing(user.uid, item.id);
        Alert.alert('Removed from favorites', 'This listing was removed from your favorites list.');
      } else {
        await addFavoriteListing(user.uid, item);
        Alert.alert('Saved to favorites', 'This listing is available in your profile favorites tab.');
      }
    } catch (err: any) {
      console.error('Failed to toggle favorite', err);
      Alert.alert('Error', err?.message ?? 'Unable to update favorites.');
    } finally {
      setFavoriteBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!item || error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ color: '#6B7280' }}>{error ?? 'Listing not found.'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        <Carousel images={images} currentIndex={currentImageIndex} setIndex={setCurrentImageIndex} />

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.category}>{item.category}</Text>
            </View>
            {!isOwnListing && (
              <TouchableOpacity onPress={toggleFavorite} disabled={favoriteBusy}>
                <Feather
                  name="heart"
                  size={24}
                  color={isFavorite ? COLORS.primary : '#9CA3AF'}
                />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.price}>${item.price.toFixed(2)}</Text>
          
          <View style={styles.metaContainer}>
            <View style={styles.conditionBadge}>
              <Text style={styles.conditionText}>{item.condition}</Text>
            </View>
            <Text style={styles.postedDate}>{postedDate}</Text>
          </View>

          {/* Seller Info */}
          <View style={styles.sellerCard}>
            <View style={styles.sellerLeft}>
              <View style={styles.sellerAvatar}>
                {/* <Text style={styles.sellerAvatarText}>
                  {sellerName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </Text> */}
                {sellerPhotoURL ? (
                  <Image source={{ uri: sellerPhotoURL }} style={styles.sellerAvatarImage} />
                ) : (
                  <Text style={styles.sellerAvatarText}>{sellerInitials}</Text>
                )}
              </View>
              <View>
                <View style={styles.sellerNameContainer}>
                  <Text style={styles.sellerName} numberOfLines={1} ellipsizeMode="clip">
                    {sellerName}
                  </Text>
                  {sellerVerified && (
                    <View style={{ marginLeft: 6, flexShrink: 0 }}>
                      <Feather name="check-circle" size={16} color={COLORS.primary} />
                    </View>
                  )}
                </View>
                <View style={styles.ratingContainer}>
                  <Feather name="star" size={14} color="#F59E0B" />
                  <Text style={styles.rating}>
                    {item.seller?.rating ? item.seller.rating.toFixed(1) : 'New Seller'}
                  </Text>
                </View>
              </View>
            </View>
            {isOwnListing ? (
              <View style={styles.yourListingBadge}>
                <Text style={styles.yourListingText}>Your Listing</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.viewProfileButton}
                onPress={() =>
                  item?.sellerId &&
                  router.push({ pathname: '/seller-profile/[userId]', params: { userId: item.sellerId } })
                }
                disabled={!item?.sellerId}
              >
                <Text style={styles.viewProfileText}>View Profile</Text>
              </TouchableOpacity>
            )}
          </View>

          {isOwnListing && (
            <View style={styles.ownerInfoBox}>
              <Feather name="info" size={16} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.ownerInfoTitle}>You published this listing</Text>
                <Text style={styles.ownerInfoText}>
                  Manage it from your profile tab or edit the details by re-posting.
                </Text>
              </View>
            </View>
          )}

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{item.description ?? 'No description provided.'}</Text>
          </View>

          {/* Report Button */}
          <TouchableOpacity style={styles.reportButton}>
            <Feather name="flag" size={16} color={COLORS.primary} />
            <Text style={styles.reportText}>Report this listing</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      {isOwnListing ? (
        <View style={styles.ownerActions}>
          <TouchableOpacity
            style={styles.ownerPrimaryButton}
            onPress={() => router.replace('/profile')}
          >
            <Feather name="user" size={18} color={COLORS.white} />
            <Text style={styles.ownerPrimaryText}>Go to Your Profile</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={toggleFavorite}
            disabled={favoriteBusy}
          >
            <Feather
              name="heart"
              size={24}
              color={isFavorite ? COLORS.primary : '#374151'}
            />
          </TouchableOpacity>

          <TouchableOpacity
              style={styles.messageButton}
              onPress={async () => {
                try {
                  if (!user?.uid) {
                    Alert.alert('Sign in required', 'Please log in to send messages.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Log in', onPress: () => router.push('/login') }
                    ]);
                    return;
                  }

                  // Get or create chat thread for buyer ↔ seller ↔ listing
                  const threadId = await getOrCreateThread({
                    itemId: item.id,
                    itemName: item.title,
                    sellerId: item.sellerId,
                    buyerId: user.uid,

                    // seller info (the person who posted the listing)
                    sellerName: resolvedSellerName,
                    sellerInitials: resolvedSellerName[0]?.toUpperCase() ?? 'S',

                    // buyer info (current logged-in user)
                    buyerName: user.displayName || user.email || "User",
                    buyerInitials: (user.displayName || user.email || "U")[0].toUpperCase(),
                  });

                  // Go to chat screen
                  router.push({
                    pathname: '/conversation/[threadId]',
                    params: {
                      threadId,
                      partnerName: resolvedSellerName,
                      itemName: item.title
                    }
                  });
                } catch (err: any) {
                  console.error('Failed to start chat:', err);
                  Alert.alert('Error', err?.message ?? 'Unable to open chat.');
                }
              }}
          >
          <Feather name="message-circle" size={20} color={COLORS.white} />
            <Text style={styles.messageButtonText}>Message Seller</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function formatTimeAgo(iso: string) {
  const mins = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

// Lightweight carousel that mimics the native gallery feel
function Carousel({ images, currentIndex, setIndex }: { images: (string | null)[]; currentIndex: number; setIndex: (i: number) => void; }) {
  const { width } = Dimensions.get('window');
  const scrollX = useRef(new Animated.Value(0)).current;
  const listRef = useRef<Animated.FlatList<string | null>>(null);

  const onMomentumEnd = (e: any) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(i);
  };

  const goTo = (i: number) => {
    if (i < 0 || i >= images.length) return;
    // @ts-ignore - Animated.FlatList has scrollToIndex
    listRef.current?.scrollToIndex?.({ index: i, animated: true });
    setIndex(i);
  };

  return (
    <View style={styles.imageContainer}>
      <Animated.FlatList
        ref={listRef}
        data={images}
        keyExtractor={(_, idx) => String(idx)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        renderItem={({ item }) => (
          <View style={{ width }}>
            {item ? (
              <Image source={{ uri: item }} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Feather name="book" size={64} color="#9CA3AF" />
              </View>
            )}
          </View>
        )}
      />

      {images.length > 1 && (
        <View style={styles.indicators}>
          {images.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.5, 1, 0.5],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View key={i} style={[styles.indicator, { width: dotWidth, opacity }]} />
            );
          })}
        </View>
      )}

      {images.length > 1 && (
        <>
          <TouchableOpacity style={[styles.navButton, styles.navLeft]} onPress={() => goTo(currentIndex - 1)} accessibilityLabel="Previous image">
            <Feather name="chevron-left" size={22} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.navButton, styles.navRight]} onPress={() => goTo(currentIndex + 1)} accessibilityLabel="Next image">
            <Feather name="chevron-right" size={22} color="#111827" />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: width,
    height: width * 0.75,
    backgroundColor: '#E5E7EB',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  indicators: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  indicatorActive: {
    backgroundColor: COLORS.white,
    width: 24,
  },
  navButton: {
    position: 'absolute',
    top: '45%',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLeft: { left: 12 },
  navRight: { right: 12 },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  category: {
    fontSize: 14,
    color: '#6B7280',
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 12,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  conditionBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  conditionText: {
    color: '#1E40AF',
    fontSize: 12,
    fontWeight: '600',
  },
  postedDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  sellerCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sellerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  sellerAvatarText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 18,
  },
  sellerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    width: '100%',
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flexShrink: 1,
    flexGrow: 1,
    overflow: 'hidden',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 14,
    color: '#6B7280',
  },
  viewProfileButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginLeft: 12,
    flexShrink: 0,
  },
  viewProfileText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  yourListingBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  yourListingText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  ownerInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EFF6FF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 20,
  },
  ownerInfoTitle: {
    color: '#1E40AF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  ownerInfoText: {
    color: '#1E40AF',
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  reportText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  saveButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageButton: {
    flex: 1,
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  messageButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
  ownerActions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  ownerPrimaryButton: {
    flex: 1,
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  ownerPrimaryText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
