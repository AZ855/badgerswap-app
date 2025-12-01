import { Feather } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../../theme/colors';
import {
    GooglePlacesAutocomplete,
    type GooglePlaceData,
    type GooglePlaceDetail,
} from './LocalGooglePlacesAutocomplete';

type LocationSelection = {
  description: string;
  lat?: number;
  lng?: number;
  placeId?: string;
};

interface PickupLocationModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (selection: LocationSelection) => void;
  apiKey?: string | null;
}

export function PickupLocationModal({ visible, onClose, onSelect, apiKey }: PickupLocationModalProps) {
  const placeholderCopy = useMemo(
    () => ({
      header: 'Search a real pickup spot',
      body: 'Choose an address or building so buyers know exactly where to meet you.',
    }),
    []
  );

  const handleSelection = (data: GooglePlaceData, details: GooglePlaceDetail | null) => {
    const geometry = details?.geometry?.location;
    if (!geometry) return;

    const description =
      data.description ||
      details?.formatted_address ||
      data.structured_formatting?.main_text ||
      'Selected location';

    onSelect({
      description,
      lat: geometry.lat,
      lng: geometry.lng,
      placeId: data.place_id,
    });
    onClose();
  };

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose} presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close location picker">
            <Feather name="x" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Pickup Location</Text>
          <View style={{ width: 22 }} />
        </View>

        {apiKey ? (
          <GooglePlacesAutocomplete
            placeholder="Search pickup spot..."
            textInputProps={{
              placeholderTextColor: '#9CA3AF',
              style: { color: '#1F2937' },
            }}
            fetchDetails
            debounce={240}
            onPress={handleSelection}
            query={{
              key: apiKey,
              language: 'en',
              components: 'country:us',
              location: '43.0731,-89.4012',
              radius: 25000,
              strictbounds: true,
            }}
            enablePoweredByContainer={false}
            styles={{
              textInputContainer: styles.searchContainer,
              textInput: styles.searchInput,
              listView: styles.listView,
              row: styles.listRow,
              description: styles.description,
              separator: styles.separator,
            }}
            renderLeftButton={() => (
              <View style={styles.searchIconWrap}>
                <Feather name="map-pin" size={18} color="#9CA3AF" />
              </View>
            )}
          />
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="map" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyHeader}>{placeholderCopy.header}</Text>
            <Text style={styles.emptyBody}>{placeholderCopy.body}</Text>
            <Text style={styles.emptyBody}>
              Add EXPO_PUBLIC_GOOGLE_PLACES_API_KEY to your environment to enable search.
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.dismissButton}>
              <Text style={styles.dismissText}>Back</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white, paddingTop: 12 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 44,
    fontSize: 15,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  listView: { paddingHorizontal: 12 },
  listRow: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  description: { color: '#111827' },
  separator: { height: 1, backgroundColor: '#E5E7EB' },
  searchIconWrap: {
    position: 'absolute',
    left: 28,
    top: 22,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyIcon: {
    backgroundColor: '#ECFDF3',
    borderRadius: 999,
    padding: 16,
    marginBottom: 6,
  },
  emptyHeader: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
  emptyBody: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  dismissButton: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#111827',
    borderRadius: 10,
  },
  dismissText: { color: COLORS.white, fontWeight: '600' },
});

export type { LocationSelection };
