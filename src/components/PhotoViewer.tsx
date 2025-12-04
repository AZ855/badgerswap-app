import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import { COLORS } from '../theme/colors';

const { width, height } = Dimensions.get('window');

type Props = {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
  watermarkTag?: string;
};

export default function PhotoViewer({
  visible,
  images,
  initialIndex = 0,
  onClose,
  watermarkTag,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const listRef = useRef<Animated.FlatList<string>>(null);
  const scrollX = useRef(new Animated.Value(initialIndex * width)).current;
  const viewShotRefs = useRef<Record<number, ViewShot | null>>({});
  const [saving, setSaving] = useState(false);
  const [imageSizes, setImageSizes] = useState<Record<string, { width: number; height: number }>>(
    {}
  );

  useEffect(() => {
    if (!visible) return;
    setActiveIndex(initialIndex);
    const offset = initialIndex * width;
    listRef.current?.scrollToOffset?.({ offset, animated: false });
  }, [initialIndex, visible]);

  useEffect(() => {
    images.forEach((uri) => {
      if (!uri || imageSizes[uri]) return;
      Image.getSize(
        uri,
        (w, h) => {
          setImageSizes((prev) => ({
            ...prev,
            [uri]: { width: w, height: h },
          }));
        },
        () => {}
      );
    });
  }, [images, imageSizes]);

  const handleMomentumEnd = (e: any) => {
    const nextIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(nextIndex);
  };

  const ensurePermission = async () => {
    const existing = await MediaLibrary.getPermissionsAsync();
    if (existing.status === 'granted') return true;
    if (existing.status === 'denied' && !existing.canAskAgain) {
      Alert.alert('Permission needed', 'Enable photo library access in Settings to save images.');
      return false;
    }
    const request = await MediaLibrary.requestPermissionsAsync();
    return request.status === 'granted';
  };

  const handleSave = async () => {
    if (saving || !images.length) return;
    const granted = await ensurePermission();
    if (!granted) return;
    const ref = viewShotRefs.current[activeIndex];
    if (!ref) {
      Alert.alert('Unable to save', 'Image is still loading. Please try again.');
      return;
    }
    try {
      setSaving(true);
      const uri = await ref.capture?.();
      if (!uri) throw new Error('Failed to capture image.');
      const asset = await MediaLibrary.createAssetAsync(uri);
      await MediaLibrary.createAlbumAsync('BadgerSwap', asset, false).catch(() => {});
      Alert.alert('Saved', 'Photo saved to your library with watermark.');
    } catch (err: any) {
      console.error('Failed to save photo', err);
      Alert.alert('Unable to save', err?.message ?? 'Something went wrong while saving.');
    } finally {
      setSaving(false);
    }
  };

  const getWatermarkOffsets = (uri: string) => {
    const meta = imageSizes[uri];
    if (!meta) {
      return { right: 16, bottom: 16 };
    }
    const scale = Math.min(width / meta.width, height / meta.height);
    const displayWidth = meta.width * scale;
    const displayHeight = meta.height * scale;
    const horizontalMargin = Math.max((width - displayWidth) / 2, 0);
    const verticalMargin = Math.max((height - displayHeight) / 2, 0);
    return {
      right: horizontalMargin + 16,
      bottom: verticalMargin + 16,
    };
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.chrome}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityLabel="Close">
            <Feather name="x" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.counter}>
            <Text style={styles.counterText}>
              {activeIndex + 1} / {images.length}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.closeButton, styles.saveButton]}
            onPress={handleSave}
            disabled={saving}
            accessibilityLabel="Save image"
          >
            <Feather
              name="download"
              size={20}
              color={saving ? 'rgba(255,255,255,0.5)' : COLORS.white}
            />
          </TouchableOpacity>
        </SafeAreaView>

        <Animated.FlatList
          ref={listRef}
          data={images}
          keyExtractor={(_, idx) => `${idx}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumEnd}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          renderItem={({ item, index }) => {
            const watermarkOffsets = getWatermarkOffsets(item);
            return (
              <ViewShot
                ref={(ref) => {
                  viewShotRefs.current[index] = ref;
                }}
                options={{ format: 'png', quality: 1, result: 'tmpfile' }}
                style={{ width, height }}
              >
                <View style={{ width, height }}>
                  <ScrollView
                    style={styles.zoomWrapper}
                    contentContainerStyle={styles.zoomContent}
                    maximumZoomScale={3}
                    minimumZoomScale={1}
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                  >
                    <Image source={{ uri: item }} style={styles.viewerImage} resizeMode="contain" />
                  </ScrollView>
                  <View pointerEvents="none" style={[styles.watermark, watermarkOffsets]}>
                    <Text style={styles.watermarkLabel}>
                      BadgerSwap {watermarkTag ? `@${watermarkTag}` : ''}
                    </Text>
                  </View>
                </View>
              </ViewShot>
            );
          }}
        />

        {images.length > 1 && (
          <View style={styles.dotRow}>
            {images.map((_, i) => {
              const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
              const dotWidth = scrollX.interpolate({
                inputRange,
                outputRange: [8, 28, 8],
                extrapolate: 'clamp',
              });
              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.25, 1, 0.25],
                extrapolate: 'clamp',
              });
              return (
                <Animated.View
                  key={i}
                  style={[styles.dot, { width: dotWidth, opacity }]}
                />
              );
            })}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  chrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counter: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  counterText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  zoomWrapper: {
    flex: 1,
  },
  zoomContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width,
    height,
  },
  watermark: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  watermarkLabel: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  dotRow: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
  },
  saveButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});
