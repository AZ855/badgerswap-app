import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { useToast } from '../../../components/ToastProvider';
import { auth } from '../../../lib/firebase';
import { COLORS } from '../../../theme/colors';
import type { Category, Item } from '../../marketplace/types';
import { updateListing } from '../api';
import { uploadImageAsync } from '../cloudinary';
import { PickupLocationModal, type LocationSelection } from '../components/PickupLocationModal';
import { clearDraftListing, loadDraftListing, saveDraftListing } from '../draftStorage';
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

function parseEditListingPayload(raw?: string | string[]) {
  if (!raw) return null;
  const source = Array.isArray(raw) ? raw[0] : raw;
  if (!source) return null;
  try {
    const parsed = JSON.parse(source);
    return {
      id: typeof parsed.id === 'string' ? parsed.id : null,
      title: typeof parsed.title === 'string' ? parsed.title : '',
      price: typeof parsed.price === 'number' ? parsed.price : Number(parsed.price ?? 0),
      category: parsed.category,
      condition: parsed.condition,
      description: typeof parsed.description === 'string' ? parsed.description : '',
      location: typeof parsed.location === 'string' ? parsed.location : '',
      locationCoordinates:
        parsed.locationCoordinates &&
        typeof parsed.locationCoordinates.lat === 'number' &&
        typeof parsed.locationCoordinates.lng === 'number'
          ? {
              lat: parsed.locationCoordinates.lat,
              lng: parsed.locationCoordinates.lng,
            }
          : null,
      imageUrls: Array.isArray(parsed.imageUrls)
        ? parsed.imageUrls.filter((url: unknown): url is string => typeof url === 'string')
        : [],
    } as Partial<Item> & { id: string | null };
  } catch (err) {
    console.warn('Failed to parse edit payload', err);
    return null;
  }
}

type DraftSnapshotPayload = {
  title: string;
  categories: string[];
  condition: Item['condition'] | '';
  price: string;
  description: string;
  images: { localUri: string; remoteUrl?: string | null }[];
  location: LocationSelection | null;
};

function serializeDraftSnapshot(payload: DraftSnapshotPayload) {
  return JSON.stringify({
    title: payload.title,
    categories: payload.categories,
    condition: payload.condition,
    price: payload.price,
    description: payload.description,
    images: payload.images.map((img) => ({
      localUri: img.localUri,
      remoteUrl: img.remoteUrl ?? null,
    })),
    location: payload.location
      ? {
          description: payload.location.description?.trim() ?? '',
          lat: typeof payload.location.lat === 'number' ? payload.location.lat : null,
          lng: typeof payload.location.lng === 'number' ? payload.location.lng : null,
        }
      : null,
  });
}

export default function PostItemScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ editItem?: string }>();
  const actionsAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView | null>(null);
  const descriptionSectionOffset = useRef(0);
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [condition, setCondition] = useState<Item['condition'] | ''>('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  type ListingImage = { id: string; localUri: string; remoteUrl?: string };
  // ListingImage view-model keeps multi-photo selections + uploads staged locally before they touch Cloudinary.
  const [images, setImages] = useState<ListingImage[]>([]);
  const [locationSelection, setLocationSelection] = useState<LocationSelection | null>(null);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [posting, setPosting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const [initializedFromEdit, setInitializedFromEdit] = useState(false);
  const [originalListingSnapshot, setOriginalListingSnapshot] = useState<{
    title: string;
    categories: string[];
    condition: Item['condition'] | '';
    price: string;
    description: string;
    location: LocationSelection | null;
    imageUris: string[];
  } | null>(null);
  const [lastSavedDraftSnapshot, setLastSavedDraftSnapshot] = useState<string | null>(null);
  const [clearingDraft, setClearingDraft] = useState(false);

  const isEditing = Boolean(editingListingId);

  const effectiveLocation = locationSelection?.description?.trim() ?? '';
  const isFormValid = Boolean(
    title &&
      categories.length > 0 &&
      condition &&
      price &&
      description &&
      images.length > 0 &&
      effectiveLocation &&
      typeof locationSelection?.lat === 'number' &&
      typeof locationSelection?.lng === 'number'
  );
  const hasDraftableContent =
    !isEditing &&
    Boolean(
      title.trim() ||
        categories.length > 0 ||
        condition ||
        price.trim() ||
        description.trim() ||
        images.length > 0 ||
        effectiveLocation
    );

  const currentDraftSnapshot = useMemo(() => {
    if (isEditing) return null;
    return serializeDraftSnapshot({
      title,
      categories,
      condition,
      price,
      description,
      images: images.map((img) => ({
        localUri: img.localUri,
        remoteUrl: img.remoteUrl ?? null,
      })),
      location: locationSelection
        ? {
            description: locationSelection.description ?? '',
            lat: typeof locationSelection.lat === 'number' ? locationSelection.lat : undefined,
            lng: typeof locationSelection.lng === 'number' ? locationSelection.lng : undefined,
          }
        : null,
    });
  }, [isEditing, title, categories, condition, price, description, images, locationSelection]);

  const shouldShowDraftButton = !isEditing && (hasDraftableContent || Boolean(lastSavedDraftSnapshot));
  const hasUnsavedDraftChanges = Boolean(
    shouldShowDraftButton &&
      hasDraftableContent &&
      currentDraftSnapshot &&
      (!lastSavedDraftSnapshot || currentDraftSnapshot !== lastSavedDraftSnapshot)
  );

  const normalizeLocation = (selection: LocationSelection | null) => {
    if (!selection) return null;
    return {
      description: selection.description?.trim() ?? '',
      lat: typeof selection.lat === 'number' ? selection.lat : null,
      lng: typeof selection.lng === 'number' ? selection.lng : null,
    } as const;
  };

  const hasEditingChanges = (() => {
    if (!isEditing || !originalListingSnapshot) return false;

    const normalizedLocation = normalizeLocation(locationSelection);
    const originalLocation = normalizeLocation(originalListingSnapshot.location);

    const categoriesChanged =
      originalListingSnapshot.categories.length !== categories.length ||
      originalListingSnapshot.categories.some((cat) => !categories.includes(cat)) ||
      categories.some((cat) => !originalListingSnapshot.categories.includes(cat));

    const imagesChanged = (() => {
      const currentUris = images
        .map((img) => img.remoteUrl ?? img.localUri)
        .filter((uri): uri is string => Boolean(uri));
      if (currentUris.length !== originalListingSnapshot.imageUris.length) return true;
      return currentUris.some((uri, idx) => uri !== originalListingSnapshot.imageUris[idx]);
    })();

    const locationChanged =
      normalizedLocation?.description !== originalLocation?.description ||
      normalizedLocation?.lat !== originalLocation?.lat ||
      normalizedLocation?.lng !== originalLocation?.lng;

    return (
      title !== originalListingSnapshot.title ||
      price !== originalListingSnapshot.price ||
      description !== originalListingSnapshot.description ||
      condition !== originalListingSnapshot.condition ||
      categoriesChanged ||
      imagesChanged ||
      locationChanged
    );
  })();

  const canSubmit = isEditing ? hasEditingChanges : isFormValid;
  const canPreview = isFormValid;
  const shouldShowActions = canPreview || canSubmit || shouldShowDraftButton;

  useEffect(() => {
    Animated.timing(actionsAnim, {
      toValue: shouldShowActions && !posting ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [shouldShowActions, posting, actionsAnim]);

  useEffect(() => {
    if (initializedFromEdit) return;
    const parsed = parseEditListingPayload(params.editItem);
    if (!parsed) return;

    setEditingListingId(parsed.id ?? null);
    setTitle(parsed.title ?? '');
    setCategories(parsed.category ? [parsed.category] : []);
    setCondition((parsed.condition as Item['condition']) ?? '');
    setPrice(String(parsed.price ?? ''));
    setDescription(parsed.description ?? '');
    if (parsed.location || parsed.locationCoordinates) {
      setLocationSelection({
        description: parsed.location ?? parsed.locationCoordinates?.lat?.toString() ?? '',
        lat: parsed.locationCoordinates?.lat,
        lng: parsed.locationCoordinates?.lng,
      });
    }
    setImages(
      (parsed.imageUrls ?? []).map((url, idx) => ({
        id: `existing-${idx}`,
        localUri: url,
        remoteUrl: url,
      }))
    );

    setOriginalListingSnapshot({
      title: parsed.title ?? '',
      categories: parsed.category ? [parsed.category] : [],
      condition: (parsed.condition as Item['condition']) ?? '',
      price: String(parsed.price ?? ''),
      description: parsed.description ?? '',
      location:
        parsed.location || parsed.locationCoordinates
          ? {
              description: parsed.location ?? parsed.locationCoordinates?.lat?.toString() ?? '',
              lat: parsed.locationCoordinates?.lat,
              lng: parsed.locationCoordinates?.lng,
            }
          : null,
      imageUris: (parsed.imageUrls ?? []).filter((url): url is string => Boolean(url)),
    });

    setInitializedFromEdit(true);
  }, [params.editItem, initializedFromEdit]);

  useEffect(() => {
    if (isEditing || params.editItem) return;
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    void loadDraftListing(userId).then((draft) => {
      if (!draft) {
        setLastSavedDraftSnapshot(null);
        return;
      }
      const normalizedCategories = draft.categories?.[0] ? [draft.categories[0]] : [];
      const normalizedCondition = (draft.condition as Item['condition']) ?? '';
      const normalizedLocation = draft.location
        ? {
            description: draft.location.description ?? '',
            lat: typeof draft.location.lat === 'number' ? draft.location.lat : undefined,
            lng: typeof draft.location.lng === 'number' ? draft.location.lng : undefined,
          }
        : null;
      const nextImages = (draft.images ?? []).map((img, idx) => ({
        id: `draft-${idx}`,
        localUri: img.localUri,
        remoteUrl: img.remoteUrl ?? undefined,
      }));

      setTitle(draft.title ?? '');
      setCategories(normalizedCategories);
      setCondition(normalizedCondition);
      setPrice(draft.price ?? '');
      setDescription(draft.description ?? '');
      setLocationSelection(normalizedLocation);
      setImages(nextImages);
      setLastSavedDraftSnapshot(
        serializeDraftSnapshot({
          title: draft.title ?? '',
          categories: normalizedCategories,
          condition: normalizedCondition,
          price: draft.price ?? '',
          description: draft.description ?? '',
          images: nextImages.map((img) => ({
            localUri: img.localUri,
            remoteUrl: img.remoteUrl ?? null,
          })),
          location: normalizedLocation,
        })
      );
    });
  }, [isEditing, params.editItem]);

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

  const scrollDescriptionIntoView = () => {
    if (!scrollViewRef.current) return;
    setTimeout(() => {
      const targetY = Math.max(descriptionSectionOffset.current - 40, 0);
      scrollViewRef.current?.scrollTo({
        y: targetY,
        animated: true,
      });
    }, 60);
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

  const handleSaveDraft = async () => {
    if (savingDraft || clearingDraft) return;
    const userId = auth.currentUser?.uid;
    if (!userId) {
      Alert.alert('Not signed in', 'Please log in before saving a draft.');
      return;
    }

    const draftState: DraftSnapshotPayload = {
      title,
      categories,
      condition,
      price,
      description,
      images: images.map((img) => ({
        localUri: img.localUri,
        remoteUrl: img.remoteUrl ?? null,
      })),
      location: locationSelection,
    };

    setSavingDraft(true);
    try {
      await saveDraftListing(userId, {
        ...draftState,
        lastReminderAt: Date.now(),
      });
      setLastSavedDraftSnapshot(serializeDraftSnapshot(draftState));
      showToast({
        title: 'Draft saved',
        message: 'We will remind you to finish it later.',
      });
    } catch (err: any) {
      console.error('Failed to save draft', err);
      Alert.alert('Could not save draft', err?.message ?? 'Please try again.');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleClearDraft = async () => {
    if (clearingDraft || savingDraft) return;
    const userId = auth.currentUser?.uid;
    if (!userId) {
      Alert.alert('Not signed in', 'Please log in before clearing a draft.');
      return;
    }

    setClearingDraft(true);
    try {
      await clearDraftListing(userId);
      resetForm({ skipDraftClear: true });
      showToast({
        title: 'Draft cleared',
        message: 'Saved draft removed.',
      });
    } catch (err: any) {
      console.error('Failed to clear draft', err);
      Alert.alert('Could not clear draft', err?.message ?? 'Please try again.');
    } finally {
      setClearingDraft(false);
    }
  };

  // Basic client-side validation prevents wasted uploads + Firestore writes.
  const ensureFormReady = () => {
    const normalizedLocation = normalizeLocation(locationSelection);
    const normalizedOriginalLocation = normalizeLocation(originalListingSnapshot?.location ?? null);

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
    const requiresCoordinates = (() => {
      if (!isEditing) return true;
      if (!originalListingSnapshot) return true;

      const hadOriginalLocation = Boolean(normalizedOriginalLocation?.description);
      if (!hadOriginalLocation) return true;

      const locationChanged =
        normalizedLocation?.description !== normalizedOriginalLocation?.description ||
        normalizedLocation?.lat !== normalizedOriginalLocation?.lat ||
        normalizedLocation?.lng !== normalizedOriginalLocation?.lng;

      return locationChanged;
    })();

    if (
      requiresCoordinates &&
      (typeof normalizedLocation?.lat !== 'number' || typeof normalizedLocation?.lng !== 'number')
    ) {
      Alert.alert(
        'Confirm location',
        'Please pick a location from the search results so we can save the coordinates.'
      );
      return false;
    }
    if (!auth.currentUser) {
      Alert.alert('Not signed in', 'Please log in before posting an item.');
      return false;
    }
    return true;
  };

  const resetForm = (options?: { skipDraftClear?: boolean }) => {
    setTitle('');
    setCategories([]);
    setCondition('');
    setPrice('');
    setDescription('');
    setImages([]);
    setLocationSelection(null);
    setLastSavedDraftSnapshot(null);
    if (!options?.skipDraftClear && auth.currentUser?.uid) {
      void clearDraftListing(auth.currentUser.uid);
    }
  };

  const navigateHome = () => {
    router.replace('/marketplace');
  };

  const currentUserPhotoURL = auth.currentUser?.photoURL?.trim() || null;

  const viewListingAfterHome = (itemId: string, fromComposer = false) => {
    navigateHome();
    setTimeout(() => {
      const params: Record<string, string> = { itemId };
      if (fromComposer) {
        params.fromComposer = '1';
      }
      router.push({ pathname: '/item-detail', params });
    }, 60);
  };

  const uploadEditedImages = async () => {
    const uploadedUrls = await Promise.all(
      images.map(async (image) => {
        if (image.remoteUrl) {
          return image.remoteUrl;
        }
        if (image.localUri) {
          return uploadImageAsync(image.localUri);
        }
        throw new Error('Image source missing local or remote URI.');
      })
    );

    if (uploadedUrls.length === 0) {
      throw new Error('Please add at least one photo.');
    }

    return uploadedUrls;
  };

  const publishNow = async () => {
    if (!auth.currentUser) {
      Alert.alert('Not signed in', 'Please log in before posting an item.');
      return;
    }
    setPosting(true);
    try {
      if (isEditing && editingListingId) {
        const uploadedUrls = await uploadEditedImages();
        const updated = await updateListing(editingListingId, {
          title: title.trim(),
          price: Number(price),
          category: (categories[0] ?? 'other') as Category,
          condition: condition as Item['condition'],
          description: description.trim(),
          location: effectiveLocation,
          locationCoordinates:
            locationSelection && typeof locationSelection.lat === 'number'
              ? { lat: locationSelection.lat, lng: locationSelection.lng as number }
              : undefined,
          imageUrls: uploadedUrls,
          coverImageUrl: uploadedUrls[0] ?? null,
        });

        viewListingAfterHome(updated.id, true);
      } else {
        // publishListing handles Cloudinary uploads + Firestore write so this screen just builds a clean payload.
        const listing = await publishListing({
          title: title.trim(),
          price: Number(price),
          category: (categories[0] ?? 'other') as Category,
          condition: condition as Item['condition'],
          description: description.trim(),
          location: effectiveLocation,
          locationCoordinates:
            locationSelection && typeof locationSelection.lat === 'number'
              ? { lat: locationSelection.lat, lng: locationSelection.lng as number }
              : undefined,
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
        viewListingAfterHome(listing.id, true);
      }
    } catch (err: any) {
      console.error('Error posting item:', err);
      Alert.alert('Error', err?.message ?? 'Failed to post item.');
    } finally {
      setPosting(false);
    }
  };

  const handlePostItem = () => {
    if (!ensureFormReady()) return;
    if (!canSubmit) return;
    Alert.alert(
      isEditing ? 'Save Changes' : 'Publish Listing',
      isEditing
        ? 'Update your listing with the latest photos and details.'
        : 'Double-check your title, price, location, and photos before going live.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isEditing ? 'Save Changes' : 'Post Item',
          style: 'destructive',
          onPress: () => void publishNow(),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Content */}
      <ScrollView
        ref={scrollViewRef}
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

          {/* Category Chips */}
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
                      prev[0] === cat.id ? [] : [cat.id]
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
            {locationSelection?.description ? (
              <View style={styles.selectedLocationCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.selectedLocationIcon}>
                    <Feather name="map-pin" size={18} color={COLORS.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedLocationLabel}>Saved pickup spot</Text>
                    <Text style={styles.selectedLocationText}>{locationSelection.description}</Text>
                    {typeof locationSelection.lat === 'number' && typeof locationSelection.lng === 'number' && (
                      <Text style={styles.selectedLocationCoords}>
                        {locationSelection.lat.toFixed(5)}, {locationSelection.lng.toFixed(5)}
                      </Text>
                    )}
                    {typeof locationSelection.lat !== 'number' || typeof locationSelection.lng !== 'number' ? (
                      <Text style={styles.locationWarning}>Tap "Choose pickup spot" to confirm coordinates.</Text>
                    ) : null}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setLocationSelection(null)}
                  style={styles.clearLocationButton}
                  accessibilityLabel="Remove pickup location"
                >
                  <Feather name="x" size={18} color="#6B7280" />
                </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.locationHelper}>
                  Use Google Places to pick a real meetup spot so buyers know exactly where to find you.
                </Text>
            )}
            <TouchableOpacity
              style={styles.locationCTA}
              onPress={() => setLocationModalVisible(true)}
              accessibilityLabel="Open pickup location search"
            >
              <Feather name="navigation" size={18} color={COLORS.white} />
              <Text style={styles.locationCTAText}>
                {locationSelection?.description ? 'Change pickup spot' : 'Choose pickup spot'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          <View
            style={styles.section}
            onLayout={(event) => {
              descriptionSectionOffset.current = event.nativeEvent.layout.y;
            }}
          >
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
              onFocus={scrollDescriptionIntoView}
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

      <PickupLocationModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        onSelect={(selection) => setLocationSelection(selection)}
        apiKey={process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY}
      />

      {/* Slide-up Actions */}
      <Animated.View
        pointerEvents={shouldShowActions && !posting ? 'auto' : 'none'}
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
        {shouldShowDraftButton && (
          <TouchableOpacity
            style={styles.draftButton}
            disabled={posting || savingDraft || clearingDraft}
            onPress={hasUnsavedDraftChanges ? handleSaveDraft : handleClearDraft}
          >
            <Text style={styles.draftButtonText}>
              {savingDraft
                ? 'Saving draft...'
                : clearingDraft
                  ? 'Clearing draft...'
                  : hasUnsavedDraftChanges
                    ? 'Save draft'
                    : 'Clear draft'}
            </Text>
          </TouchableOpacity>
        )}
        {canPreview && (
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
                locationCoordinates:
                  locationSelection && typeof locationSelection.lat === 'number'
                    ? { lat: locationSelection.lat, lng: locationSelection.lng as number }
                    : undefined,
                primaryCategoryId: primaryCategory,
                categoryLabel,
                listingId: editingListingId,
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
        )}
        {canSubmit && (
          <TouchableOpacity
            style={styles.actionPostButton}
            onPress={handlePostItem}
            disabled={posting}
          >
            <Text style={styles.actionPostButtonText}>
            {posting
                ? isEditing
                  ? 'Saving...'
                  : 'Posting...'
                : isEditing
                  ? 'Save Changes'
                  : 'Post Item'}
            </Text>
          </TouchableOpacity>
        )}
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
  locationHelper: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  selectedLocationCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 12,
    position: 'relative',
  },
  selectedLocationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedLocationLabel: {
    fontSize: 12,
    color: '#065F46',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  selectedLocationText: {
    fontSize: 14,
    color: '#064E3B',
    fontWeight: '600',
  },
  selectedLocationCoords: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
  },
  locationWarning: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 6,
  },
  clearLocationButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
  },
  locationCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
  },
  locationCTAText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 15,
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
  draftButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  draftButtonText: {
    color: COLORS.white,
    fontWeight: '700',
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
