import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../theme/colors';

const THRESHOLD = 80;
const PINNED_HEIGHT = 56;
const MAX_PULL_DISTANCE = THRESHOLD * 1.6;
const RUBBER_BAND_COEFF = 55;
const COLLAPSE_EASING = Easing.bezier(0.2, 0.9, 0.2, 1);

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  indicatorOffset?: number;
}

export function usePullToRefresh(options: UsePullToRefreshOptions) {
  const { onRefresh, indicatorOffset = 12 } = options;
  const pullDistance = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const spinnerRotation = useRef(new Animated.Value(0)).current;
  const spinnerLoop = useRef<Animated.CompositeAnimation | null>(null);
  const [pulling, setPulling] = useState(false);
  const [thresholdReached, setThresholdReached] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [indicatorLocked, setIndicatorLocked] = useState(false);

  const indicatorVisible = pulling || refreshing || indicatorLocked;
  const spinnerRotate = spinnerRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    if (refreshing) {
      spinnerLoop.current?.stop();
      spinnerRotation.setValue(0);
      spinnerLoop.current = Animated.loop(
        Animated.timing(spinnerRotation, {
          toValue: 1,
          duration: 300,
          easing: Easing.linear,
          useNativeDriver: false,
        })
      );
      spinnerLoop.current.start();
    } else {
      spinnerLoop.current?.stop();
    }
    return () => {
      spinnerLoop.current?.stop();
    };
  }, [refreshing, spinnerRotation]);

  const rubberBand = useCallback((distance: number) => {
    const clamped = Math.min(MAX_PULL_DISTANCE, Math.max(0, distance));
    return RUBBER_BAND_COEFF * (1 - Math.exp(-clamped / RUBBER_BAND_COEFF));
  }, []);

  const collapseToOrigin = useCallback(
    (onEnd?: () => void) => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          easing: COLLAPSE_EASING,
          useNativeDriver: false,
        }),
        Animated.timing(pullDistance, {
          toValue: 0,
          duration: 220,
          easing: COLLAPSE_EASING,
          useNativeDriver: false,
        }),
      ]).start(() => {
        setPulling(false);
        setIndicatorLocked(false);
        setThresholdReached(false);
        onEnd?.();
      });
    },
    [pullDistance, translateY]
  );

  const pinIndicator = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: PINNED_HEIGHT,
        duration: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(pullDistance, {
        toValue: THRESHOLD,
        duration: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [pullDistance, translateY]);

  const triggerRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    setIndicatorLocked(true);
    setPulling(false);
    pinIndicator();
    try {
      await Promise.all([
        Promise.resolve(onRefresh?.()),
        new Promise((resolve) => setTimeout(resolve, 400)),
      ]);
    } catch (err) {
      console.error('Pull-to-refresh error', err);
    } finally {
      collapseToOrigin(() => {
        setRefreshing(false);
      });
    }
  }, [refreshing, onRefresh, pinIndicator, collapseToOrigin]);

  const onScroll = useCallback(
    (event: any) => {
      if (refreshing || indicatorLocked) return;
      const offsetY = event?.nativeEvent?.contentOffset?.y ?? 0;
      if (offsetY < 0) {
        const distance = Math.min(MAX_PULL_DISTANCE, -offsetY);
        pullDistance.setValue(distance);
        translateY.setValue(rubberBand(distance));
        if (!pulling) setPulling(true);
        if (!thresholdReached && distance >= THRESHOLD) {
          setThresholdReached(true);
          Haptics.selectionAsync().catch(() => {});
        }
        if (thresholdReached && distance < THRESHOLD) {
          setThresholdReached(false);
        }
      } else if (pulling) {
        pullDistance.setValue(0);
        translateY.setValue(0);
        setPulling(false);
        setThresholdReached(false);
      }
    },
    [pullDistance, pulling, thresholdReached, refreshing, indicatorLocked, rubberBand, translateY]
  );

  const onRelease = useCallback(() => {
    if (refreshing || indicatorLocked) {
      return;
    }
    if (thresholdReached) {
      triggerRefresh();
    } else if (pulling) {
      collapseToOrigin();
    }
  }, [thresholdReached, refreshing, triggerRefresh, indicatorLocked, pulling, collapseToOrigin]);

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
  const listStyle = useMemo(
    () => ({
      transform: [{ translateY }],
    }),
    [translateY]
  );

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
          <Animated.View
            style={[
              styles.spinnerRing,
              { transform: [{ rotate: spinnerRotate }] },
            ]}
          />
        ) : (
          <Animated.View
            style={[styles.arc, { transform: [{ rotate: arcRotate }] }]}
          />
        )}
      </Animated.View>
      {!refreshing && pulling && (
        <Text style={styles.label}>
          {thresholdReached ? 'Release to refresh' : 'Pull to refresh'}
        </Text>
      )}
    </Animated.View>
  );

  return {
    indicator,
    onScroll,
    onRelease,
    listStyle,
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
    backgroundColor: 'transparent',
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
  spinnerRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: '#CBD5F5',
    borderTopColor: COLORS.primary,
    borderLeftColor: '#CBD5F5',
    borderBottomColor: '#CBD5F5',
    borderRightColor: '#CBD5F5',
  },
  label: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
});
