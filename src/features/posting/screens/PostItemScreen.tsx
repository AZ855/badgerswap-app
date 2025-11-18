import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth } from '../../../lib/firebase';
import { COLORS } from '../../../theme/colors';
import type { Category, Item } from '../../marketplace/types';
import { publishListing, type ListingImageSource } from '../publishListing';

const CATEGORIES = [
  { id: 'books', name: 'Books', icon: 'book' },
  { id: 'electronics', name: 'Electronics', icon: 'smartphone' },
  { id: 'furniture', name: 'Furniture', icon: 'home' },
  { id: 'clothing', name: 'Clothing', icon: 'shopping-bag' },
  { id: 'sports', name: 'Sports', icon: 'activity' },
  { id: 'kitchen', name: 'Kitchen', icon: 'coffee' },
  { id: 'other', name: 'Other', icon: 'box' },
];

const CONDITIONS = ['Like New', 'Excellent', 'Good', 'Fair'];

const SUGGESTED_LOCATIONS = [
  'Memorial Union',
  'College Library',
  'Union South',
  'Grainger Hall',
  'Dejope Residence Hall',
  'Sellery Hall',
  'Witte Hall',
  'Engineering Hall',
  'Campus Book Store',
  'State Street',
];

export default function PostItemScreen() {
  const insets = useSafeAreaInsets();
  const actionsAnim = useRef(new Animated.Value(0)).current;

  const [title, setTitle] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [condition, setCondition] = useState<Item['condition'] | ''>('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  type ListingImage = { id: string; localUri: string; remoteUrl?: string };
  const [images, setImages] = useState<ListingImage[]>([]);
  const [location, setLocation] = useState('');
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [posting, setPosting] = useState(false);

  const effectiveLocation = (location || locationSearch).trim();
  const isFormValid = Boolean(
    title &&
      categories.length > 0 &&
      condition &&
      price &&
      description &&
      images.length > 0 &&
      effectiveLocation
  );

  useEffect(() => {
    Animated.timing(actionsAnim, {
      toValue: isFormValid && !posting ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [isFormValid, posting, actionsAnim]);

  const filteredLocations = SUGGESTED_LOCATIONS.filter((loc) =>
    loc.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const appendImage = (uri: string) => {
    setImages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        localUri: uri,
      },
    ]);
  };

  const openCamera = async () => {
    if (images.length >= 5) {
      Alert.alert('Limit reached', 'You can add up to 5 photos.');
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need camera access to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
    });

    if (!result.canceled && result.assets.length > 0) {
      appendImage(result.assets[0].uri);
    }
  };

  const openGallery = async () => {
    if (images.length >= 5) {
      Alert.alert('Limit reached', 'You can add up to 5 photos.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need access to your photos to upload an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });

    if (!result.canceled && result.assets.length > 0) {
      appendImage(result.assets[0].uri);
    }
  };

  const handleImagePicker = () => {
    Alert.alert('Add Photos', 'Choose an option', [
      {
        text: 'Take Photo',
        onPress: () => {
          void openCamera();
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: () => {
          void openGallery();
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const ensureFormReady = () => {
    if (!title.trim()) {
      Alert.alert('Missing Info', 'Please enter a title');
      return false;
    }
    if (categories.length === 0) {
      Alert.alert('Missing Info', 'Please select a category');
      return false;
    }
    if (!condition) {
      Alert.alert('Missing Info', 'Please select item condition');
      return false;
    }
    if (!price.trim() || isNaN(Number(price))) {
      Alert.alert('Invalid Price', 'Please enter a valid price');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Missing Info', 'Please add a description');
      return false;
    }
    if (images.length === 0) {
      Alert.alert('Missing Photos', 'Please add at least one photo');
      return false;
    }
    if (!effectiveLocation) {
      Alert.alert('Missing Info', 'Please select a pickup location');
      return false;
    }
    if (!auth.currentUser) {
      Alert.alert('Not signed in', 'Please log in before posting an item.');
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setTitle('');
    setCategories([]);
    setCondition('');
    setPrice('');
    setDescription('');
    setImages([]);
    setLocation('');
    setLocationSearch('');
  };

  const navigateHome = () => {
    router.replace('/marketplace');
  };

  const currentUserPhotoURL = auth.currentUser?.photoURL?.trim() || null;

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
    setPosting(true);
    try {
      const listing = await publishListing({
        title: title.trim(),
        price: Number(price),
        category: (categories[0] ?? 'other') as Category,
        condition: condition as Item['condition'],
        description: description.trim(),
        location: effectiveLocation,
        images: images.map<ListingImageSource>((img) => ({
          localUri: img.localUri,
          remoteUrl: img.remoteUrl,
        })),
        sellerName:
          auth.currentUser.displayName?.trim() ||
          auth.currentUser.email?.split('@')[0] ||
          'BadgerSwap Seller',
        sellerPhotoURL: currentUserPhotoURL,
        userId: auth.currentUser.uid,
      });

      resetForm();
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
      console.error('Error posting item:', err);
      Alert.alert('Error', err?.message ?? 'Failed to post item.');
    } finally {
      setPosting(false);
    }
  };

  const handlePostItem = () => {
    if (!ensureFormReady()) return;
    Alert.alert(
      'Publish Listing',
      'Double-check your title, price, location, and photos before going live.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Post Item', style: 'destructive', onPress: () => void publishNow() },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      >
        <View style={styles.content}>
          {/* Photos Grid */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Photos</Text>
              <Text style={styles.required}>*</Text>
              <Text style={styles.photoCount}>({images.length}/5)</Text>
            </View>
            <View style={styles.photoGrid}>
              {images.map((img, index) => (
                <View key={img.id} style={styles.photoItem}>
                  <View style={styles.photoPreview}>
                    {img.localUri ? (
                      <Image source={{ uri: img.localUri }} style={StyleSheet.absoluteFillObject} />
                    ) : (
                      <Text style={styles.photoEmoji}>📷</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => removeImage(img.id)}
                  >
                    <Feather name="x" size={12} color={COLORS.white} />
                  </TouchableOpacity>
                  {index === 0 && (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverText}>Cover</Text>
                    </View>
                  )}
                </View>
              ))}
              {images.length < 5 && (
                <TouchableOpacity
                  style={styles.addPhotoButton}
                  onPress={handleImagePicker}
                >
                  <Feather name="upload" size={20} color="#9CA3AF" />
                  <Text style={styles.addPhotoText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Title */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Title</Text>
              <Text style={styles.required}>*</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="What are you selling?"
              placeholderTextColor="#9CA3AF"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
            <Text style={styles.charCount}>{title.length}/100</Text>
          </View>

          {/* Price */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Price</Text>
              <Text style={styles.required}>*</Text>
            </View>
            <View style={styles.priceInput}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.priceField}
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Category Chips (multi-select) */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Category</Text>
              <Text style={styles.required}>*</Text>
            </View>
            <View style={styles.chipContainer}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.chip,
                    categories.includes(cat.id) && styles.chipActive,
                  ]}
                  onPress={() => {
                    setCategories((prev) =>
                      prev.includes(cat.id)
                        ? prev.filter((c) => c !== cat.id)
                        : [...prev, cat.id]
                    );
                  }}
                >
                  <Feather
                    name={cat.icon as any}
                    size={14}
                    color={
                      categories.includes(cat.id) ? COLORS.white : '#374151'
                    }
                  />
                  <Text
                    style={[
                      styles.chipText,
                      categories.includes(cat.id) && styles.chipTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Condition Chips */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Condition</Text>
              <Text style={styles.required}>*</Text>
            </View>
            <View style={styles.chipContainer}>
              {CONDITIONS.map((cond) => (
                <TouchableOpacity
                  key={cond}
                  style={[
                    styles.chip,
                    condition === cond && styles.chipActive,
                  ]}
                  onPress={() => setCondition(cond as Item['condition'])}
                >
                  <Text
                    style={[
                      styles.chipText,
                      condition === cond && styles.chipTextActive,
                    ]}
                  >
                    {cond}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Location Search */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Pickup Location</Text>
              <Text style={styles.required}>*</Text>
            </View>
            <View style={styles.searchInputContainer}>
              <Feather
                name="search"
                size={18}
                color="#9CA3AF"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search campus locations..."
                placeholderTextColor="#9CA3AF"
                value={location || locationSearch}
                onChangeText={(text) => {
                  setLocationSearch(text);
                  setLocation('');
                  setShowLocationSearch(true);
                }}
                onFocus={() => setShowLocationSearch(true)}
              />
              {location && (
                <TouchableOpacity
                  onPress={() => {
                    setLocation('');
                    setLocationSearch('');
                  }}
                  style={styles.clearButton}
                >
                  <Feather name="x" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            {/* Location Dropdown */}
            {showLocationSearch && !location && (
              <View style={styles.locationDropdown}>
                <ScrollView style={styles.locationList} nestedScrollEnabled>
                  {filteredLocations.length > 0 ? (
                    filteredLocations.map((loc) => (
                      <TouchableOpacity
                        key={loc}
                        style={styles.locationItem}
                        onPress={() => {
                          setLocation(loc);
                          setLocationSearch('');
                          setShowLocationSearch(false);
                        }}
                      >
                        <Feather name="map-pin" size={16} color="#9CA3AF" />
                        <Text style={styles.locationText}>{loc}</Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.noLocations}>No locations found</Text>
                  )}
                </ScrollView>
              </View>
            )}

            {location && (
              <View style={styles.selectedLocation}>
                <Feather name="map-pin" size={16} color="#10B981" />
                <Text style={styles.selectedLocationText}>{location}</Text>
              </View>
            )}
          </View>

          {/* Description */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Description</Text>
              <Text style={styles.required}>*</Text>
            </View>
            <TextInput
              style={styles.textarea}
              placeholder="Describe your item (condition, features, reason for selling...)"
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.charCount}>{description.length}/500</Text>
          </View>

          {/* Info Banner */}
          <View style={[styles.infoBanner, { marginBottom: 24 }]}>
            <Text style={styles.infoEmoji}>ℹ️</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Posting Tips</Text>
              <Text style={styles.infoText}>• Use clear, well-lit photos</Text>
              <Text style={styles.infoText}>• Be honest about condition</Text>
              <Text style={styles.infoText}>• Price competitively</Text>
              <Text style={styles.infoText}>• Respond to messages quickly</Text>
            </View>
          </View>
          <View style={{ height: 8 }} />
        </View>
      </ScrollView>

      {/* Slide-up Actions */}
      <Animated.View
        pointerEvents={isFormValid && !posting ? 'auto' : 'none'}
        style={[
          styles.bottomActions,
          {
            opacity: actionsAnim,
            transform: [
              {
                translateY: actionsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [40, 0],
                }),
              },
            ],
            bottom: insets.bottom + 72,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.previewButton}
          disabled={posting}
          onPress={() => {
            if (!ensureFormReady()) return;
            const primaryCategory = (categories[0] ?? 'other') as Category;
            const categoryLabel = categories.length
              ? CATEGORIES.filter((cat) => categories.includes(cat.id))
                  .map((cat) => cat.name)
                  .join(', ')
              : 'General';
            const payload = {
              title: title.trim(),
              price,
              condition,
              description: description.trim(),
              location: effectiveLocation,
              primaryCategoryId: primaryCategory,
              categoryLabel,
              images: images.map<ListingImageSource>((img) => ({
                localUri: img.localUri,
                remoteUrl: img.remoteUrl ?? null,
              })),
            };
            router.push({
              pathname: '/item-preview',
              params: {
                payload: JSON.stringify(payload),
              },
            });
          }}
        >
          <Text style={styles.previewButtonText}>Preview</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionPostButton}
          onPress={handlePostItem}
          disabled={posting}
        >
          <Text style={styles.actionPostButtonText}>
            {posting ? 'Posting...' : 'Post Item'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: COLORS.white,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  postButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  postButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  section: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  required: {
    fontSize: 12,
    color: COLORS.primary,
    marginLeft: 4,
  },
  photoCount: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoItem: {
    position: 'relative',
    width: '23%',
  },
  photoPreview: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoEmoji: {
    fontSize: 24,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  coverText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '700',
  },
  addPhotoButton: {
    width: '23%',
    aspectRatio: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  addPhotoText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: COLORS.white,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingLeft: 12,
    backgroundColor: COLORS.white,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginRight: 4,
  },
  priceField: {
    flex: 1,
    paddingVertical: 10,
    paddingRight: 12,
    fontSize: 15,
    color: '#111827',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: COLORS.white,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  chipTextActive: {
    color: COLORS.white,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  clearButton: {
    padding: 4,
  },
  locationDropdown: {
    marginTop: 4,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    maxHeight: 192,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  locationList: {
    flex: 1,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  locationText: {
    fontSize: 14,
    color: '#111827',
  },
  noLocations: {
    textAlign: 'center',
    paddingVertical: 16,
    fontSize: 14,
    color: '#6B7280',
  },
  selectedLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  selectedLocationText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  textarea: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    minHeight: 120,
    backgroundColor: COLORS.white,
  },
  infoBanner: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
  },
  infoEmoji: {
    fontSize: 18,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 18,
  },
  bottomActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    zIndex: 10,
    elevation: 6,
  },
  previewButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewButtonText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  actionPostButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPostButtonText: {
    color: COLORS.white,
    fontWeight: '700',
  },
});
