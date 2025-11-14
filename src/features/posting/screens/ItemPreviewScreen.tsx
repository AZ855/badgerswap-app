import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../../theme/colors';

const { width } = Dimensions.get('window');

export default function ItemPreviewScreen() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const itemData = {
    title: (params.title as string) || 'Untitled Item',
    price: (params.price as string) || '0',
    condition: (params.condition as string) || 'Good',
    description: (params.description as string) || 'No description provided.',
    category: (params.category as string) || 'General',
    images: params.images ? safeParseImages(params.images as string) : [],
  };

  const handlePublish = () => {
    Alert.alert(
      'Publish Listing',
      'Are you ready to publish this item to BadgerSwap marketplace?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Publish',
          onPress: () => {
            Alert.alert('Success!', 'Your item has been posted to the marketplace.', [
              { text: 'OK', onPress: () => router.replace('/marketplace') },
            ]);
          },
        },
      ]
    );
  };

  const handleEdit = () => router.back();

  const images = itemData.images.length > 0 ? itemData.images : [null];
  const bottomInset = Math.max(insets.bottom, 12);

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
            <View style={styles.imagePlaceholder}>
              <Icon name="image" size={64} color="#9CA3AF" />
              <Text style={styles.imagePlaceholderText}>Your uploaded photos</Text>
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
              <Text style={styles.title}>{itemData.title}</Text>
              <Text style={styles.category}>{itemData.category}</Text>
            </View>
            <View style={{ opacity: 0.5 }}>
              <Icon name="heart" size={24} color="#9CA3AF" />
            </View>
          </View>

          <Text style={styles.price}>${itemData.price}</Text>

          <View style={styles.metaContainer}>
            <View style={styles.conditionBadge}>
              <Text style={styles.conditionText}>{itemData.condition}</Text>
            </View>
            <Text style={styles.postedDate}>Just now</Text>
          </View>

          {/* Seller Info (Preview - Your profile) */}
          <View style={styles.sellerCard}>
            <View style={styles.sellerLeft}>
              <View style={styles.sellerAvatar}>
                <Text style={styles.sellerAvatarText}>You</Text>
              </View>
              <View>
                <View style={styles.sellerNameContainer}>
                  <Text style={styles.sellerName}>Your Name</Text>
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
            <Text style={styles.description}>{itemData.description}</Text>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Icon name="info" size={20} color={COLORS.info} />
            <Text style={styles.infoText}>Buyers will be able to message you about this item once it's published.</Text>
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

        <TouchableOpacity style={styles.publishButton} onPress={handlePublish}>
          <Icon name="check" size={20} color={COLORS.white} />
          <Text style={styles.publishButtonText}>Publish Listing</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function safeParseImages(s: string): any[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
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

