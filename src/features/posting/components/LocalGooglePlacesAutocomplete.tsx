import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputProps,
} from 'react-native';

export type GooglePlaceData = {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};

export type GooglePlaceDetail = {
  formatted_address?: string;
  geometry?: { location?: { lat: number; lng: number } };
};

type AutocompleteQuery = {
  key: string;
  language?: string;
  components?: string;
  location?: string;
  radius?: number;
  strictbounds?: boolean;
};

type StylesConfig = Partial<{
  textInputContainer: object;
  textInput: object;
  listView: object;
  row: object;
  description: object;
  separator: object;
}>;

type GooglePlacesAutocompleteProps = {
  placeholder?: string;
  fetchDetails?: boolean;
  debounce?: number;
  onPress: (data: GooglePlaceData, details: GooglePlaceDetail | null) => void;
  query: AutocompleteQuery;
  enablePoweredByContainer?: boolean;
  styles?: StylesConfig;
  renderLeftButton?: () => React.ReactNode;
  textInputProps?: TextInputProps;
};

async function fetchAutocomplete(
  input: string,
  query: AutocompleteQuery
): Promise<GooglePlaceData[]> {
  const params = new URLSearchParams({
    input,
    key: query.key,
    language: query.language ?? 'en',
  });

  if (query.components) params.append('components', query.components);
  if (query.location) params.append('location', query.location);
  if (query.radius) params.append('radius', String(query.radius));
  if (query.strictbounds) params.append('strictbounds', 'true');

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`
  );
  const json = await response.json();
  if (json.status !== 'OK' || !Array.isArray(json.predictions)) return [];

  return json.predictions.map((prediction: any) => ({
    description: prediction.description,
    place_id: prediction.place_id,
    structured_formatting: prediction.structured_formatting,
  }));
}

async function fetchPlaceDetails(
  placeId: string,
  query: AutocompleteQuery
): Promise<GooglePlaceDetail | null> {
  const params = new URLSearchParams({
    key: query.key,
    place_id: placeId,
    language: query.language ?? 'en',
    fields: 'formatted_address,geometry/location',
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`
  );
  const json = await response.json();
  if (json.status !== 'OK' || !json.result) return null;
  return {
    formatted_address: json.result.formatted_address,
    geometry: json.result.geometry,
  };
}

export function GooglePlacesAutocomplete({
  placeholder,
  fetchDetails = false,
  debounce = 250,
  onPress,
  query,
  enablePoweredByContainer = true,
  styles: styleOverrides,
  renderLeftButton,
  textInputProps,
}: GooglePlacesAutocompleteProps) {
  const [text, setText] = useState('');
  const [results, setResults] = useState<GooglePlaceData[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { style: textInputStyleOverride, ...restTextInputProps } = textInputProps ?? {};

  const mergedStyles = useMemo(() => ({ ...defaultStyles, ...styleOverrides }), [styleOverrides]);

  useEffect(() => {
    if (!text) {
      setResults([]);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const matches = await fetchAutocomplete(text, query);
        setResults(matches);
      } catch (error) {
        console.warn('Autocomplete error', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, debounce);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [debounce, query, text]);

  const handleSelect = async (item: GooglePlaceData) => {
    let details: GooglePlaceDetail | null = null;
    if (fetchDetails) {
      try {
        details = await fetchPlaceDetails(item.place_id, query);
      } catch (error) {
        console.warn('Details fetch error', error);
      }
    }
    onPress(item, details);
    setText(item.description);
    setResults([]);
  };

  const renderItem = ({ item }: { item: GooglePlaceData }) => (
    <TouchableOpacity style={[defaultStyles.row, mergedStyles?.row]} onPress={() => handleSelect(item)}>
      <Text style={[defaultStyles.description, mergedStyles?.description]}>{item.description}</Text>
    </TouchableOpacity>
  );

  return (
    <View>
      <View style={[defaultStyles.textInputContainer, mergedStyles?.textInputContainer]}>
        {renderLeftButton && <View style={{ position: 'absolute', left: 0 }}>{renderLeftButton()}</View>}
        <TextInput
          placeholder={placeholder}
          value={text}
          onChangeText={setText}
          style={[
            defaultStyles.textInput,
            mergedStyles?.textInput,
            textInputStyleOverride,
          ]}
          autoCorrect={false}
          autoCapitalize="none"
          {...restTextInputProps}
        />
        {loading && (
          <View style={defaultStyles.spinner}>
            <ActivityIndicator size="small" />
          </View>
        )}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.place_id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={[defaultStyles.separator, mergedStyles?.separator]} />}
        style={[defaultStyles.listView, mergedStyles?.listView]}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={
          enablePoweredByContainer
            ? () => (
                <Text style={defaultStyles.poweredBy}>Powered by Google Places</Text>
              )
            : undefined
        }
      />
    </View>
  );
}

const defaultStyles = StyleSheet.create({
  textInputContainer: {},
  textInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#111827',
    paddingLeft: 36,
  },
  listView: { paddingHorizontal: 12 },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  description: { color: '#111827' },
  separator: { height: 1, backgroundColor: '#E5E7EB' },
  spinner: { position: 'absolute', right: 12, top: 12 },
  poweredBy: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 8,
  },
});

export default GooglePlacesAutocomplete;
