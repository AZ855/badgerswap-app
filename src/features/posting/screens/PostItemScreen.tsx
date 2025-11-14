import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Feather as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../../theme/colors';

const CATEGORIES = [
  'Books',
  'Electronics',
  'Furniture',
  'Clothing',
  'Sports & Outdoors',
  'Home & Kitchen',
  'Other',
];

const CONDITIONS = ['Like New', 'Excellent', 'Good', 'Fair'];

export default function PostItemScreen() {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<{ id: string }[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showConditionPicker, setShowConditionPicker] = useState(false);

  const handleImagePicker = () => {
    Alert.alert(
      'Add Photos',
      'Image picking is stubbed for now. Add a placeholder or cancel.',
      [
        {
          text: 'Add Placeholder',
          onPress: () => setImages((prev) => [...prev, { id: String(Date.now()) }]),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handlePostItem = () => {
    if (!title.trim()) return Alert.alert('Error', 'Please enter a title');
    if (!category) return Alert.alert('Error', 'Please select a category');
    if (!condition) return Alert.alert('Error', 'Please select a condition');
    if (!price.trim() || isNaN(Number(price))) return Alert.alert('Error', 'Please enter a valid price');
    if (!description.trim()) return Alert.alert('Error', 'Please enter a description');
    if (images.length === 0) return Alert.alert('Error', 'Please add at least one photo');

    Alert.alert('Success!', 'Your item has been posted to the marketplace.', [
      { text: 'OK', onPress: () => router.replace('/marketplace') },
    ]);
  };

  const navOffset = insets.bottom + 72; // keep bottom actions above persistent nav

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos *</Text>
          <Text style={styles.sectionSubtitle}>Add up to 5 photos</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosContainer}>
            {images.map((img, index) => (
              <View key={img.id} style={styles.photoItem}>
                <View style={styles.photoPlaceholder}>
                  <Icon name="image" size={32} color="#9CA3AF" />
                </View>
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => setImages(images.filter((_, i) => i !== index))}
                >
                  <Icon name="x" size={16} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            ))}

            {images.length < 5 && (
              <TouchableOpacity style={styles.addPhotoButton} onPress={handleImagePicker}>
                <Icon name="camera" size={32} color="#9CA3AF" />
                <Text style={styles.addPhotoText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Calculus Textbook 9th Edition"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.label}>Category *</Text>
          <TouchableOpacity style={styles.picker} onPress={() => setShowCategoryPicker((s) => !s)}>
            <Text style={category ? styles.pickerText : styles.pickerPlaceholder}>
              {category || 'Select category'}
            </Text>
            <Icon name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>

          {showCategoryPicker && (
            <View style={styles.pickerOptions}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={styles.pickerOption}
                  onPress={() => {
                    setCategory(cat);
                    setShowCategoryPicker(false);
                  }}
                >
                  <Text style={styles.pickerOptionText}>{cat}</Text>
                  {category === cat && <Icon name="check" size={20} color={COLORS.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Condition */}
        <View style={styles.section}>
          <Text style={styles.label}>Condition *</Text>
          <TouchableOpacity style={styles.picker} onPress={() => setShowConditionPicker((s) => !s)}>
            <Text style={condition ? styles.pickerText : styles.pickerPlaceholder}>
              {condition || 'Select condition'}
            </Text>
            <Icon name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>

          {showConditionPicker && (
            <View style={styles.pickerOptions}>
              {CONDITIONS.map((cond) => (
                <TouchableOpacity
                  key={cond}
                  style={styles.pickerOption}
                  onPress={() => {
                    setCondition(cond);
                    setShowConditionPicker(false);
                  }}
                >
                  <Text style={styles.pickerOptionText}>{cond}</Text>
                  {condition === cond && <Icon name="check" size={20} color={COLORS.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Price */}
        <View style={styles.section}>
          <Text style={styles.label}>Price *</Text>
          <View style={styles.priceInput}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={styles.priceInputField}
              placeholder="0"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={styles.textarea}
            placeholder="Describe your item (condition, features, reason for selling, etc.)"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>

        <View style={{ height: navOffset + 56 }} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { marginBottom: navOffset }]}>
        <TouchableOpacity
          style={styles.previewButton}
          onPress={() =>
            router.push({
              pathname: '/item-preview',
              params: {
                title,
                category,
                condition,
                price,
                description,
                images: JSON.stringify(images),
              },
            })
          }
        >
          <Text style={styles.previewButtonText}>Preview</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.postButton} onPress={handlePostItem}>
          <Text style={styles.postButtonText}>Post Item</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flex: 1 },
  section: { padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 4 },
  sectionSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  photosContainer: { flexDirection: 'row' },
  photoItem: { position: 'relative', marginRight: 12 },
  photoPlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  addPhotoText: { fontSize: 12, color: '#6B7280', marginTop: 8 },
  label: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#374151',
  },
  picker: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerText: { fontSize: 16, color: '#374151' },
  pickerPlaceholder: { fontSize: 16, color: '#9CA3AF' },
  pickerOptions: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerOptionText: { fontSize: 16, color: '#374151' },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingLeft: 16,
  },
  currencySymbol: { fontSize: 20, fontWeight: '600', color: '#111827', marginRight: 8 },
  priceInputField: { flex: 1, paddingVertical: 14, paddingRight: 16, fontSize: 16, color: '#374151' },
  textarea: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#374151',
    minHeight: 120,
  },
  charCount: { textAlign: 'right', fontSize: 12, color: '#9CA3AF', marginTop: 8 },
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
  previewButton: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewButtonText: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
  postButton: {
    flex: 1,
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
});
