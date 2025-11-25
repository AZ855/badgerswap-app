import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  collection,
  db,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from '../../../lib/firebase';
import { COLORS } from '../../../theme/colors';
import { useAuth } from '../../auth/AuthProvider';
import type { Item } from '../../marketplace/types';
import { mapListingFromDoc } from '../../marketplace/useListings';

const REPORT_REASONS = [
  { id: 'inappropriate', label: 'Inappropriate or offensive' },
  { id: 'scam', label: 'Scam or suspicious' },
  { id: 'prohibited', label: 'Prohibited item' },
  { id: 'duplicate', label: 'Duplicate or spam' },
  { id: 'misleading', label: 'Misleading description' },
  { id: 'other', label: 'Other' },
];

export default function ReportListingScreen() {
  const params = useLocalSearchParams<{ itemId?: string; title?: string }>();
  const itemId = useMemo(() => (typeof params.itemId === 'string' ? params.itemId : ''), [params.itemId]);
  const listingTitleFromParams = typeof params.title === 'string' ? params.title : undefined;

  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [listing, setListing] = useState<Item | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [note, setNote] = useState('');
  const [alreadyReported, setAlreadyReported] = useState(false);

  const listingTitle = listing?.title ?? listingTitleFromParams ?? 'Listing';
  const isOtherSelected = selectedReason === 'other';
  const isSubmitDisabled =
    !selectedReason || (isOtherSelected && !note.trim()) || submitting || alreadyReported;

  useLayoutEffect(() => {
    navigation.setOptions({ title: 'Report this listing' });
  }, [navigation]);

  useEffect(() => {
    let isMounted = true;
    const loadListing = async () => {
      if (!itemId) {
        setError('Listing not found.');
        setLoading(false);
        return;
      }
      try {
        const ref = doc(db, 'listings', itemId);
        const snap = await getDoc(ref);
        if (!isMounted) return;
        if (snap.exists()) {
          type ListingDocData = Parameters<typeof mapListingFromDoc>[1];
          setListing(mapListingFromDoc(snap.id, snap.data() as ListingDocData));
          setError(null);
        } else {
          setListing(null);
          setError('Listing not found.');
        }
      } catch (err: any) {
        console.error('Failed to load listing', err);
        if (isMounted) setError('Unable to load listing.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadListing();
    return () => {
      isMounted = false;
    };
  }, [itemId]);

  useEffect(() => {
    const checkExistingReport = async () => {
      if (!user?.uid || !itemId) return;
      const reportId = `${user.uid}_${itemId}`;
      const ref = doc(db, 'reports', reportId);
      const snap = await getDoc(ref);
      setAlreadyReported(snap.exists());
    };

    checkExistingReport();
  }, [user?.uid, itemId]);

  const handleSubmit = async () => {
    if (!user?.uid) {
      Alert.alert('Sign in required', 'Please log in to submit a report.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log in', onPress: () => router.push('/login') },
      ]);
      return;
    }

    if (!itemId) {
      Alert.alert('Listing not found', 'We could not find this listing.');
      return;
    }

    if (!selectedReason) {
      Alert.alert('Select a reason', 'Please select a reason for your report.');
      return;
    }

    const trimmedNote = note.trim();
    if (isOtherSelected && !trimmedNote) {
      Alert.alert('Add a reason', 'Please describe the issue when selecting "Other."');
      return;
    }

    const reportId = `${user.uid}_${itemId}`;
    setSubmitting(true);
    try {
      const reportRef = doc(collection(db, 'reports'), reportId);
      const existing = await getDoc(reportRef);
      if (existing.exists()) {
        setAlreadyReported(true);
        Alert.alert('Report submitted', 'You already reported this listing.');
        return;
      }

      await setDoc(reportRef, {
        itemId,
        userId: user.uid,
        reason: selectedReason,
        note: note.trim() || null,
        listingTitle: listing?.title ?? listingTitleFromParams ?? null,
        sellerId: listing?.sellerId ?? null,
        createdAt: serverTimestamp(),
      });

      setAlreadyReported(true);
      Alert.alert('Report submitted', 'Thanks for letting us know. We will review this listing.', [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      console.error('Failed to submit report', err);
      Alert.alert('Error', err?.message ?? 'Unable to submit your report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error || !listingTitle) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ color: '#6B7280' }}>{error ?? 'Listing not found.'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.title}>Report this listing</Text>
          <Text style={styles.subtitle}>Tell us what’s wrong with this listing.</Text>

          <View style={styles.listingChip}>
            <Feather name="tag" size={16} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.listingTitle} numberOfLines={2}>
                {listingTitle}
              </Text>
              {listing?.price != null && (
                <Text style={styles.listingPrice}>${listing.price.toFixed(2)}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Reason</Text>
          <View style={{ gap: 10 }}>
            {REPORT_REASONS.map((reason) => {
              const selected = selectedReason === reason.id;
              return (
                <TouchableOpacity
                  key={reason.id}
                  style={[styles.radioRow, selected && styles.radioRowSelected]}
                  onPress={() => setSelectedReason(reason.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                    {selected && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.radioLabel}>{reason.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Additional details {isOtherSelected ? '(required for "Other")' : '(optional)'}
          </Text>
          {isOtherSelected && (
            <Text style={styles.helperText}>Please describe the issue when choosing "Other."</Text>
          )}
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Describe the issue"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            style={styles.input}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, isSubmitDisabled && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitDisabled}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitText}>
              {alreadyReported ? 'Already reported' : 'Submit'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    color: '#4B5563',
    fontSize: 14,
  },
  listingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 12,
  },
  listingTitle: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 16,
  },
  listingPrice: {
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  helperText: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: -6,
    marginBottom: 10,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  radioRowSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F9FAFF',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  radioLabel: {
    color: '#111827',
    fontSize: 15,
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  submitButton: {
    height: 54,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});