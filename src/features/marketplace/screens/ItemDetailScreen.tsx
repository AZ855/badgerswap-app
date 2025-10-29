import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  TextInput,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../../../theme/colors';

import { getItemById } from '../mock/listings'; // placeholder import

const { width } = Dimensions.get('window');

export default function ItemDetailScreen() {
  const params = useLocalSearchParams() as { itemId?: string };
  const [isSaved, setIsSaved] = useState(false);
  const [note, setNote] = useState(''); 

  // fallback item if mock list helper isn't wired yet
  const fallbackItem = {
    id: 'local-fallback',
    title: 'Calculus Textbook - 9th Edition',
    price: 45,
    condition: 'Good',
    description:
      'Used calculus textbook in good condition. Some highlighting and notes in margins, but all pages are intact. Great for MATH 221/222. Originally $180, selling for $45.',
    images: [null, null, null],
    seller: { name: 'Sarah Johnson', verified: true, rating: 4.8 },
    category: 'Books',
    postedDate: '2 days ago',
    location: 'College Library',
  };

  // try to fetch from Role B’s mock; otherwise use fallback
  const item = useMemo(() => {
    try {
      if (params?.itemId) {
        const found = getItemById?.(String(params.itemId));
        if (found) {
          return {
            id: found.id,
            title: found.title,
            price: found.price,
            condition: found.condition ?? 'Good',
            description:
              'No description provided. (Mock data)\n\nThis is a placeholder for Milestone 1.',
            images: [null], // no real images for now
            seller: { name: 'Seller', verified: true, rating: 4.7 },
            category:
              (found.category?.charAt(0).toUpperCase() + found.category?.slice(1)) ||
              'Other',
            postedDate: 'Today',
            location: found.location ?? 'UW-Madison',
          };
        }
      }
    } catch (_) {}
    return fallbackItem;
  }, [params?.itemId]);

  const images = item.images?.length ? item.images : [null];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image */}
        <View style={styles.imageContainer}>
          <View style={styles.imagePlaceholder}>
            <Feather
              name={item.category?.toLowerCase() === 'books' ? 'book' : 'image'}
              size={64}
              color="#9CA3AF"
            />
          </View>

          {images.length > 1 && (
            <View style={styles.indicators}>
              {images.map((_, i) => (
                <View key={i} style={[styles.indicator, i === 0 && styles.indicatorActive]} />
              ))}
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title + Favorite */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.category}>{item.category}</Text>
              {!!item.location && <Text style={styles.location}>{item.location}</Text>}
            </View>

            <TouchableOpacity
              onPress={() => setIsSaved((s) => !s)}
              accessibilityRole="button"
              accessibilityLabel={isSaved ? 'Unsave' : 'Save'}
            >
              <Feather name="heart" size={26} color={isSaved ? COLORS.primary : '#9CA3AF'} />
            </TouchableOpacity>
          </View>

          {/* Price */}
          <Text style={styles.price}>${item.price}</Text>

          {/* Meta */}
          <View style={styles.metaContainer}>
            <View style={styles.conditionBadge}>
              <Text style={styles.conditionText}>{item.condition}</Text>
            </View>
            <Text style={styles.postedDate}>{item.postedDate}</Text>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>

          {/* Personal note – local only placeholder component */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your note (local)</Text>
            <View style={styles.noteBox}>
              <TextInput
                placeholder="Add a quick note about this item…"
                value={note}
                onChangeText={setNote}
                style={styles.noteInput}
                multiline
              />
            </View>
          </View>

          {/* Report - placeholder for milestone 1 */}
          <TouchableOpacity style={styles.reportButton}>
            <Feather name="flag" size={16} color={COLORS.primary} />
            <Text style={styles.reportText}>Report this listing</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom: Favorite button only */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[styles.favoriteButton, isSaved && styles.favoriteButtonActive]}
          onPress={() => setIsSaved((s) => !s)}
        >
          <Feather
            name="heart"
            size={20}
            color={isSaved ? COLORS.white : COLORS.primary}
          />
          <Text
            style={[
              styles.favoriteButtonText,
              isSaved && styles.favoriteButtonTextActive,
            ]}
          >
            {isSaved ? 'Saved' : 'Add to Favorites'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

{/* Styles */}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  imageContainer: {
    width, height: width * 0.75, backgroundColor: '#E5E7EB', position: 'relative',
  },
  imagePlaceholder: {
    width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  indicators: {
    position: 'absolute', bottom: 16, left: 0, right: 0, flexDirection: 'row',
    justifyContent: 'center', gap: 8,
  },
  indicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  indicatorActive: { backgroundColor: COLORS.white, width: 24 },

  content: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titleContainer: { flex: 1, marginRight: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 4 },
  category: { fontSize: 14, color: '#6B7280' },
  location: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

  price: { fontSize: 32, fontWeight: '700', color: COLORS.primary, marginVertical: 12 },

  metaContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  conditionBadge: {
    backgroundColor: '#DBEAFE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
  },
  conditionText: { color: '#1E40AF', fontSize: 12, fontWeight: '600' },
  postedDate: { fontSize: 14, color: '#6B7280' },

  section: { marginTop: 14, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 10 },
  description: { fontSize: 16, color: '#374151', lineHeight: 24 },

  noteBox: {
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, padding: 12,
  },
  noteInput: { minHeight: 60, fontSize: 15, color: '#111827' },

  reportButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  reportText: { color: COLORS.primary, fontSize: 14, fontWeight: '500' },

  bottomActions: {
    padding: 16, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  favoriteButton: {
    height: 56, borderRadius: 28, borderWidth: 1, borderColor: COLORS.primary,
    backgroundColor: COLORS.white, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  favoriteButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  favoriteButtonText: { color: COLORS.primary, fontSize: 16, fontWeight: '700' },
  favoriteButtonTextActive: { color: COLORS.white },
});
