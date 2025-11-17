import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../theme/colors';

const THRESHOLD = 90;
const INDICATOR_HEIGHT = 68;

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  indicatorOffset?: number;
}

export function usePullToRefresh(options: UsePullToRefreshOptions) {
  const { onRefresh, indicatorOffset = 12 } = options;
  const pullDistance = useRef(new Animated.Value(0)).current;
  const [pulling, setPulling] = useState(false);
  const [thresholdReached, setThresholdReached] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [indicatorLocked, setIndicatorLocked] = useState(false);
  const [listPaddingTop, setListPaddingTop] = useState(0);
  const indicatorVisible = pulling || refreshing || indicatorLocked;

  useEffect(() => {
    const sub = pullDistance.addListener(({ value }) => {
      const padding = Math.min(Math.max(value, 0), INDICATOR_HEIGHT);
      setListPaddingTop(padding);
    });
    return () => {
      pullDistance.removeListener(sub);
    };
  }, [pullDistance]);

  const resetIndicator = useCallback(() => {
    Animated.timing(pullDistance, {
      toValue: 0,
      duration: 150,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start(() => {
      setPulling(false);
      setIndicatorLocked(false);
      setThresholdReached(false);
    });
  }, [pullDistance]);

  const triggerRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    setIndicatorLocked(true);
    pullDistance.setValue(THRESHOLD);
    try {
      await Promise.all([
        Promise.resolve(onRefresh?.()),
        new Promise((resolve) => setTimeout(resolve, 400)),
      ]);
    } catch (err) {
      console.error('Pull-to-refresh error', err);
    } finally {
      setRefreshing(false);
      resetIndicator();
    }
  }, [refreshing, onRefresh, pullDistance, resetIndicator]);

  const onScroll = useCallback(
    (event: any) => {
      if (refreshing) return;
      const offsetY = event?.nativeEvent?.contentOffset?.y ?? 0;
      if (offsetY < 0) {
        const distance = Math.min(THRESHOLD * 1.4, -offsetY);
        pullDistance.setValue(distance);
        if (!pulling) setPulling(true);
        if (!thresholdReached && distance >= THRESHOLD) {
          setThresholdReached(true);
          Haptics.selectionAsync().catch(() => {});
        }
        if (thresholdReached && distance < THRESHOLD) {
          setThresholdReached(false);
        }
      } else if (!indicatorLocked) {
        resetIndicator();
      }
    },
    [pullDistance, pulling, thresholdReached, refreshing, indicatorLocked, resetIndicator]
  );

  const onRelease = useCallback(() => {
    if (thresholdReached && !refreshing) {
      triggerRefresh();
    } else if (!indicatorLocked && !refreshing) {
      resetIndicator();
    }
  }, [thresholdReached, refreshing, triggerRefresh, indicatorLocked, resetIndicator]);

  const progress = useMemo(
    () =>
      pullDistance.interpolate({
        inputRange: [0, THRESHOLD],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      }),
    [pullDistance]
  );

  const circleScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.75, 1],
  });
  const arcRotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['135deg', '495deg'],
  });
  const indicatorOpacity = pullDistance.interpolate({
    inputRange: [0, 10, 20],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  const indicator = (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.indicatorContainer,
        { opacity: indicatorVisible ? indicatorOpacity : 0, top: indicatorOffset },
      ]}
    >
      <Animated.View
        style={[
          styles.circle,
          { transform: [{ scale: circleScale }] },
        ]}
      >
        <Animated.View
          style={[
            styles.arcTrack,
            refreshing && { opacity: 0 },
          ]}
        />
        {refreshing ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <Animated.View
            style={[styles.arc, { transform: [{ rotate: arcRotate }] }]}
          />
        )}
      </Animated.View>
      {(pulling || refreshing) && (
        <Text style={styles.label}>
          {refreshing
            ? 'Refreshing...'
            : thresholdReached
            ? 'Release to refresh'
            : 'Pull to refresh'}
        </Text>
      )}
    </Animated.View>
  );

  return {
    indicator,
    onScroll,
    onRelease,
    listPaddingTop,
  };
}

const styles = StyleSheet.create({
  indicatorContainer: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  arcTrack: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    opacity: 0.5,
  },
  arc: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent',
    borderTopColor: COLORS.primary,
    borderLeftColor: COLORS.primary,
    position: 'absolute',
  },
  label: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
});
