import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../features/auth/AuthProvider';
import type { Category, Item } from '../features/marketplace/types';
import { db, doc, onSnapshot, setDoc } from '../lib/firebase';
import { COLORS } from '../theme/colors';

const CATEGORY_OPTIONS: { id: Category; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { id: 'books', label: 'Books', icon: 'book' },
  { id: 'electronics', label: 'Electronics', icon: 'smartphone' },
  { id: 'furniture', label: 'Furniture', icon: 'home' },
  { id: 'clothing', label: 'Clothing', icon: 'shopping-bag' },
  { id: 'sports', label: 'Sports', icon: 'activity' },
  { id: 'kitchen', label: 'Kitchen', icon: 'coffee' },
  { id: 'other', label: 'Other', icon: 'box' },
];

const PRONOUN_OPTIONS = ['She/Her', 'He/Him', 'They/Them', 'Any pronouns', 'Prefer not to say'];

type RecommendationCondition = 'Any' | Item['condition'];

const CONDITION_OPTIONS: RecommendationCondition[] = [
  'Any',
  'Like New',
  'Excellent',
  'Good',
  'Fair',
];

const DEFAULT_RECOMMENDATION_PREFS = {
  pronouns: '',
  minPrice: '',
  maxPrice: '',
  categories: [] as Category[],
  condition: 'Any' as RecommendationCondition,
};

export default function PreferencesScreen() {
  const { user, loading } = useAuth();
  const [recPrefs, setRecPrefs] = useState(DEFAULT_RECOMMENDATION_PREFS);
  const [savedRecPrefs, setSavedRecPrefs] = useState(DEFAULT_RECOMMENDATION_PREFS);
  const [initialLoading, setInitialLoading] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setInitialLoading(false);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as {
            recommendationPreferences?: Partial<{
              minPrice: number;
              maxPrice: number;
              categories: Category[];
              condition: RecommendationCondition | Item['condition'];
            }>;
            pronouns?: string | null;
          };

          const rawRec = data.recommendationPreferences ?? {};
          const parsedCategories = Array.isArray(rawRec.categories)
            ? rawRec.categories.filter((cat): cat is Category =>
                CATEGORY_OPTIONS.some((option) => option.id === cat)
              )
            : [];

          const parsedCondition = CONDITION_OPTIONS.includes(
            rawRec.condition as RecommendationCondition
          )
            ? (rawRec.condition as RecommendationCondition)
            : 'Any';

          const parsedPrefs = {
            pronouns: typeof data.pronouns === 'string' ? data.pronouns : '',
            minPrice:
              typeof rawRec.minPrice === 'number' && !Number.isNaN(rawRec.minPrice)
                ? String(rawRec.minPrice)
                : '',
            maxPrice:
              typeof rawRec.maxPrice === 'number' && !Number.isNaN(rawRec.maxPrice)
                ? String(rawRec.maxPrice)
                : '',
            categories: parsedCategories,
            condition: parsedCondition,
          };

          setRecPrefs(parsedPrefs);
          setSavedRecPrefs(parsedPrefs);
        } else {
          setRecPrefs(DEFAULT_RECOMMENDATION_PREFS);
          setSavedRecPrefs(DEFAULT_RECOMMENDATION_PREFS);
        }
        setInitialLoading(false);
      },
      (error) => {
        console.error('Failed to load preferences', error);
        setInitialLoading(false);
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  const handleSavePreferences = async () => {
    if (!user) {
      Alert.alert('Not signed in', 'Sign in to update your preferences.');
      return;
    }

    const minPrice = recPrefs.minPrice.trim() ? Number(recPrefs.minPrice) : null;
    const maxPrice = recPrefs.maxPrice.trim() ? Number(recPrefs.maxPrice) : null;

    if (minPrice != null && Number.isNaN(minPrice)) {
      Alert.alert('Invalid price', 'Enter a valid minimum price.');
      return;
    }

    if (maxPrice != null && Number.isNaN(maxPrice)) {
      Alert.alert('Invalid price', 'Enter a valid maximum price.');
      return;
    }

    if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
      Alert.alert('Check your range', 'Minimum price cannot exceed the maximum price.');
      return;
    }

    setSavingPreferences(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(
        userRef,
        {
          pronouns: recPrefs.pronouns.trim() ? recPrefs.pronouns.trim() : null,
          recommendationPreferences: {
            minPrice,
            maxPrice,
            categories: recPrefs.categories,
            condition: recPrefs.condition === 'Any' ? null : recPrefs.condition,
          },
        },
        { merge: true }
      );
      setSavedRecPrefs(recPrefs);
      Alert.alert('Preferences saved', 'We will tailor your recommendations.');
    } catch (error: any) {
      console.error('Failed to save preferences', error);
      Alert.alert('Could not save', error?.message ?? 'Please try again in a moment.');
    } finally {
      setSavingPreferences(false);
    }
  };

  const hasPreferenceChanges = useMemo(() => {
    return (
      recPrefs.pronouns !== savedRecPrefs.pronouns ||
      recPrefs.minPrice !== savedRecPrefs.minPrice ||
      recPrefs.maxPrice !== savedRecPrefs.maxPrice ||
      recPrefs.condition !== savedRecPrefs.condition ||
      recPrefs.categories.join(',') !== savedRecPrefs.categories.join(',')
    );
  }, [recPrefs, savedRecPrefs]);

  if (loading || initialLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <Feather name="sliders" size={24} color={COLORS.primary} />
        <Text style={styles.errorText}>Sign in to set your preferences.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/login')}>
          <Text style={styles.primaryButtonText}>Go to login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Preferences</Text>
          <Text style={styles.subtitle}>
            Update your pronouns and tailor what we recommend to you.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Pronouns</Text>
            <Text style={styles.cardDescription}>
              These appear on your profile next to your name.
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.chipRow}>
              {PRONOUN_OPTIONS.map((label) => {
                const active = recPrefs.pronouns === label;
                return (
                  <TouchableOpacity
                    key={label}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setRecPrefs((prev) => ({ ...prev, pronouns: label }))}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <Text style={styles.sectionHeader}>Recommendations</Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Tune what we send you</Text>
            <Text style={styles.cardDescription}>
              Set your ideal price range, categories, and item condition to see more relevant
              recommendations.
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Preferred price range</Text>
            <View style={styles.priceRow}>
              <View style={styles.priceField}>
                <Text style={styles.pricePrefix}>$</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Min"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  value={recPrefs.minPrice}
                  onChangeText={(text) =>
                    setRecPrefs((prev) => ({ ...prev, minPrice: text.replace(/[^0-9.]/g, '') }))
                  }
                />
              </View>
              <View style={styles.priceDivider} />
              <View style={styles.priceField}>
                <Text style={styles.pricePrefix}>$</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Max"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  value={recPrefs.maxPrice}
                  onChangeText={(text) =>
                    setRecPrefs((prev) => ({ ...prev, maxPrice: text.replace(/[^0-9.]/g, '') }))
                  }
                />
              </View>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Categories</Text>
            <View style={styles.chipRow}>
              {CATEGORY_OPTIONS.map((cat) => {
                const active = recPrefs.categories.includes(cat.id);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() =>
                      setRecPrefs((prev) => ({
                        ...prev,
                        categories: active
                          ? prev.categories.filter((id) => id !== cat.id)
                          : [...prev.categories, cat.id],
                      }))
                    }
                  >
                    <Feather
                      name={cat.icon}
                      size={14}
                      color={active ? COLORS.white : '#374151'}
                    />
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.helperText}>
              Leave blank to get recommendations from any category.
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Condition</Text>
            <View style={styles.chipRow}>
              {CONDITION_OPTIONS.map((cond) => {
                const active = recPrefs.condition === cond;
                return (
                  <TouchableOpacity
                    key={cond}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setRecPrefs((prev) => ({ ...prev, condition: cond }))}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{cond}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, (!hasPreferenceChanges || savingPreferences) && styles.primaryButtonDisabled]}
            onPress={handleSavePreferences}
            disabled={!hasPreferenceChanges || savingPreferences}
          >
            <Text style={styles.primaryButtonText}>
              {savingPreferences ? 'Saving…' : 'Save preferences'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    gap: 12,
  },
  errorText: {
    textAlign: 'center',
    color: '#111827',
    marginBottom: 4,
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    color: '#4B5563',
    lineHeight: 20,
  },
  card: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 12,
  },
  cardHeader: {
    gap: 6,
    padding: 16,
    paddingBottom: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cardDescription: { color: '#6B7280', lineHeight: 18 },
  fieldGroup: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  fieldLabel: { fontWeight: '700', color: '#111827' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipActive: { backgroundColor: COLORS.primary },
  chipText: { color: '#374151', fontWeight: '600' },
  chipTextActive: { color: COLORS.white },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priceField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
  },
  pricePrefix: { color: '#6B7280', fontWeight: '700', marginRight: 6 },
  priceInput: { flex: 1, color: '#111827' },
  priceDivider: { width: 12 },
  helperText: { color: '#6B7280', fontSize: 12 },
  primaryButton: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 8,
    marginHorizontal: 16,
    color: '#6B7280',
    fontWeight: '700',
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.5,
  },
});