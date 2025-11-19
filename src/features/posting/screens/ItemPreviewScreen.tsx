import { Feather as Icon } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth } from '../../../lib/firebase';
import { COLORS } from '../../../theme/colors';
import type { Category, Item } from '../../marketplace/types';
import { publishListing, type ListingImageSource } from '../publishListing';

const { width } = Dimensions.get('window');

type PreviewPayload = {
  title: string;
  price: string;
  condition: Item['condition'];
  description: string;
  location: string;
  primaryCategoryId: Category;
  categoryLabel: string;
  images: ListingImageSource[];
};

const DEFAULT_PAYLOAD: PreviewPayload = {
  title: 'Untitled Item',
  price: '0',
  condition: 'Good',
  description: 'No description provided.',
  location: 'Madison, WI',
  primaryCategoryId: 'other',
  categoryLabel: 'General',
  images: [],
};

export default function ItemPreviewScreen() {
  const params = useLocalSearchParams<{ payload?: string | string[] }>();
  const insets = useSafeAreaInsets();
  const [posting, setPosting] = useState(false);

  // Deserialize the PostItem view-model payload so preview renders exactly what will be published.
  const payload = useMemo(
    () => parsePayload(params.payload),
    [params.payload]
  );

  const previewImages = useMemo(
    () =>
      payload.images
        .map((img) => img.remoteUrl ?? img.localUri)
        .filter((uri): uri is string => typeof uri === 'string' && uri.length > 0),
    [payload.images]
  );

  const handleEdit = () => router.back();

  const images = previewImages.length > 0 ? previewImages : [null];
  const bottomInset = Math.max(insets.bottom, 12);
  const currentUserName =
    auth.currentUser?.displayName?.trim() ||
    auth.currentUser?.email?.split('@')[0] ||
    'You';
  const currentUserInitials = currentUserName
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const numericPrice = useMemo(() => {
    const value = Number(payload.price);
    if (Number.isNaN(value)) return payload.price || '0.00';
    return value.toFixed(2);
  }, [payload.price]);

  const navigateHome = () => {
    router.replace('/marketplace');
  };

  const viewListingAfterHome = (itemId: string) => {
    navigateHome();
    setTimeout(() => {
      router.push({ pathname: '/item-detail', params: { itemId } });
    }, 60);
  };

  const publishNow = async () => {
    if (!auth.currentUser) {
      Alert.alert('Not signed in', 'Please log in before posting an item.');
      return;
    }
    const priceValue = Number(payload.price);
    if (Number.isNaN(priceValue)) {
      Alert.alert('Invalid Price', 'Please return and fix the price before posting.');
      return;
    }
    setPosting(true);
    try {
      // Reuse the same publishListing pipeline here so preview and edit share one backend integration path.
      const listing = await publishListing({
        title: payload.title,
        price: priceValue,
        category: payload.primaryCategoryId,
        condition: payload.condition,
        description: payload.description,
        location: payload.location,
        images: payload.images,
        sellerName:
          auth.currentUser.displayName?.trim() ||
          auth.currentUser.email?.split('@')[0] ||
          'BadgerSwap Seller',
        userId: auth.currentUser.uid,
      });

      Alert.alert('Posted!', 'Your item is now live on BadgerSwap marketplace.', [
        {
          text: 'Back to Marketplace',
          style: 'cancel',
          onPress: navigateHome,
        },
        {
          text: 'View Listing',
          onPress: () => viewListingAfterHome(listing.id),
        },
      ]);
    } catch (err: any) {
      console.error('Error posting item from preview:', err);
      Alert.alert('Error', err?.message ?? 'Failed to publish this item.');
    } finally {
      setPosting(false);
    }
  };

  const handlePublish = () => {
    if (posting) return;
    Alert.alert(
      'Publish Listing',
      'Ready to make this listing visible to everyone?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Publish', style: 'destructive', onPress: () => void publishNow() },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Preview Banner */}
      <View style={styles.previewBanner}>
        <Icon name="eye" size={20} color={COLORS.white} />
        <Text style={styles.previewText}>Preview Mode - This is how buyers will see your listing</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Display */}
        <View style={styles.imageContainer}>
          {images[0] ? (
            <View style={styles.previewImageWrap}>
              <Image source={{ uri: images[0] as string }} style={styles.previewImage} />
            </View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Icon name="camera" size={64} color="#9CA3AF" />
              <Text style={styles.noImageText}>No photos added</Text>
            </View>
          )}

          {images.length > 1 && (
            <View style={styles.indicators}>
              {images.map((_, index) => (
                <View key={index} style={[styles.indicator, index === 0 && styles.indicatorActive]} />
              ))}
            </View>
          )}

          {images.length > 0 && (
            <View style={styles.imageCount}>
              <Icon name="image" size={14} color={COLORS.white} />
              <Text style={styles.imageCountText}>{images.length}</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{payload.title}</Text>
              <Text style={styles.category}>{payload.categoryLabel}</Text>
            </View>
            <View style={{ opacity: 0.5 }}>
              <Icon name="heart" size={24} color="#9CA3AF" />
            </View>
          </View>

          <Text style={styles.price}>${numericPrice}</Text>

          <View style={styles.metaContainer}>
            <View style={styles.conditionBadge}>
              <Text style={styles.conditionText}>{payload.condition}</Text>
            </View>
            <Text style={styles.postedDate}>Just now</Text>
          </View>

          {/* Seller Info (Preview - Your profile) */}
          <View style={styles.sellerCard}>
            <View style={styles.sellerLeft}>
              <View style={styles.sellerAvatar}>
                <Text style={styles.sellerAvatarText}>{currentUserInitials || 'Y'}</Text>
              </View>
              <View>
                <View style={styles.sellerNameContainer}>
                  <Text style={styles.sellerName}>{currentUserName}</Text>
                  <Icon name="check-circle" size={16} color={COLORS.primary} />
                </View>
                <View style={styles.ratingContainer}>
                  <Icon name="star" size={14} color="#F59E0B" />
                  <Text style={styles.rating}>New Seller</Text>
                </View>
              </View>
            </View>
            <View style={styles.yourListingBadge}>
              <Text style={styles.yourListingText}>Your Listing</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{payload.description}</Text>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Icon name="info" size={20} color={COLORS.info} />
            <Text style={styles.infoText}>Buyers will be able to message you about this item once it is published.</Text>
          </View>

          {/* Preview Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Icon name="eye" size={20} color="#6B7280" />
              <Text style={styles.statLabel}>Views</Text>
              <Text style={styles.statValue}>0</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Icon name="heart" size={20} color="#6B7280" />
              <Text style={styles.statLabel}>Saves</Text>
              <Text style={styles.statValue}>0</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Icon name="message-circle" size={20} color="#6B7280" />
              <Text style={styles.statLabel}>Messages</Text>
              <Text style={styles.statValue}>0</Text>
            </View>
          </View>
        </View>
        <View style={{ height: bottomInset + 88 }} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { paddingBottom: bottomInset }]}>
        <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
          <Icon name="edit-2" size={20} color={COLORS.primary} />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.publishButton, posting && { opacity: 0.6 }]}
          onPress={handlePublish}
          disabled={posting}
        >
          <Icon name="check" size={20} color={COLORS.white} />
          <Text style={styles.publishButtonText}>
            {posting ? 'Publishing...' : 'Publish Listing'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Defensive parsing keeps preview resilient even if navigation params are missing or stale.
function parsePayload(raw?: string | string[]): PreviewPayload {
  const source = Array.isArray(raw) ? raw[0] : raw;
  if (!source) return DEFAULT_PAYLOAD;
  try {
    const parsed = JSON.parse(source);
    const images: ListingImageSource[] = Array.isArray(parsed.images)
      ? parsed.images
          .map((img: any) => ({
            localUri: typeof img?.localUri === 'string' ? img.localUri : null,
            remoteUrl: typeof img?.remoteUrl === 'string' ? img.remoteUrl : null,
          }))
          .filter((img: ListingImageSource) => img.localUri || img.remoteUrl)
      : [];

    return {
      title: typeof parsed.title === 'string' && parsed.title.length > 0 ? parsed.title : DEFAULT_PAYLOAD.title,
      price: typeof parsed.price === 'string' ? parsed.price : String(parsed.price ?? DEFAULT_PAYLOAD.price),
      condition: (parsed.condition as Item['condition']) ?? DEFAULT_PAYLOAD.condition,
      description:
        typeof parsed.description === 'string' && parsed.description.length > 0
          ? parsed.description
          : DEFAULT_PAYLOAD.description,
      location:
        typeof parsed.location === 'string' && parsed.location.length > 0 ? parsed.location : DEFAULT_PAYLOAD.location,
      primaryCategoryId: (parsed.primaryCategoryId as Category) ?? DEFAULT_PAYLOAD.primaryCategoryId,
      categoryLabel:
        typeof parsed.categoryLabel === 'string' && parsed.categoryLabel.length > 0
          ? parsed.categoryLabel
          : DEFAULT_PAYLOAD.categoryLabel,
      images,
    };
  } catch (err) {
    console.error('Failed to parse preview payload', err);
    return DEFAULT_PAYLOAD;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  previewBanner: {
    backgroundColor: COLORS.info,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  previewText: { color: COLORS.white, fontSize: 14, fontWeight: '500', flex: 1 },
  imageContainer: { width, height: width * 0.75, backgroundColor: '#E5E7EB', position: 'relative' },
  previewImageWrap: { width: '100%', height: '100%', borderRadius: 16, overflow: 'hidden' },
  previewImage: { width: '100%', height: '100%' },
  imagePlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  imagePlaceholderText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  noImageText: { marginTop: 12, fontSize: 14, color: '#9CA3AF' },
  indicators: { position: 'absolute', bottom: 16, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  indicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255, 255, 255, 0.5)' },
  indicatorActive: { backgroundColor: COLORS.white, width: 24 },
  imageCount: { position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6 },
  imageCountText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  content: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  titleContainer: { flex: 1, marginRight: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 4 },
  category: { fontSize: 14, color: '#6B7280' },
  price: { fontSize: 32, fontWeight: '700', color: COLORS.primary, marginBottom: 12 },
  metaContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  conditionBadge: { backgroundColor: '#DBEAFE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  conditionText: { color: '#1E40AF', fontSize: 12, fontWeight: '600' },
  postedDate: { fontSize: 14, color: '#6B7280' },
  sellerCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  sellerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sellerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  sellerAvatarText: { color: COLORS.white, fontWeight: '600', fontSize: 16 },
  sellerNameContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  sellerName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rating: { fontSize: 14, color: '#6B7280' },
  yourListingBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  yourListingText: { color: '#6B7280', fontSize: 12, fontWeight: '600' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 12 },
  description: { fontSize: 16, color: '#374151', lineHeight: 24 },
  infoBox: { flexDirection: 'row', backgroundColor: '#EFF6FF', padding: 16, borderRadius: 12, gap: 12, marginBottom: 20, borderWidth: 1, borderColor: '#BFDBFE' },
  infoText: { flex: 1, fontSize: 14, color: '#1E40AF', lineHeight: 20 },
  statsContainer: { flexDirection: 'row', backgroundColor: COLORS.white, padding: 20, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  statItem: { flex: 1, alignItems: 'center', gap: 8 },
  statLabel: { fontSize: 12, color: '#6B7280' },
  statValue: { fontSize: 20, fontWeight: '700', color: '#111827' },
  statDivider: { width: 1, backgroundColor: COLORS.border, marginHorizontal: 8 },
  bottomActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  editButton: {
    flex: 1,
    height: 56,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  editButtonText: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
  publishButton: {
    flex: 2,
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  publishButtonText: { color: COLORS.white, fontSize: 18, fontWeight: '600' },
});
