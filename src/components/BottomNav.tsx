import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, AccessibilityInfo } from 'react-native';
import { usePathname, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';
import * as Haptics from 'expo-haptics';

type TabKey = 'marketplace' | 'post-item' | 'chat-list' | 'profile';
type TabHref = '/marketplace' | '/post-item' | '/chat-list' | '/profile';

export default function BottomNav() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [reduceMotion, setReduceMotion] = useState(false);
  const lastPressRef = useRef<number>(0);

  const tabs = useMemo(
    () => [
      { key: 'marketplace' as TabKey, label: 'Home', icon: 'home' as const, href: '/marketplace' as const },
      { key: 'post-item' as TabKey, label: 'Post', icon: 'plus-circle' as const, href: '/post-item' as const },
      { key: 'chat-list' as TabKey, label: 'Messages', icon: 'message-circle' as const, href: '/chat-list' as const },
      { key: 'profile' as TabKey, label: 'Profile', icon: 'user' as const, href: '/profile' as const },
    ],
    []
  );

  const activeKey: TabKey = useMemo(() => {
    if (pathname?.startsWith('/post-item')) return 'post-item';
    if (pathname?.startsWith('/chat') || pathname?.startsWith('/chat-list')) return 'chat-list';
    if (pathname?.startsWith('/profile')) return 'profile';
    return 'marketplace';
  }, [pathname]);

  const scales = useRef<Record<TabKey, Animated.Value>>({
    'marketplace': new Animated.Value(0),
    'post-item': new Animated.Value(0),
    'chat-list': new Animated.Value(0),
    'profile': new Animated.Value(0),
  }).current;

  const labelOpacities = useRef<Record<TabKey, Animated.Value>>({
    'marketplace': new Animated.Value(0),
    'post-item': new Animated.Value(0),
    'chat-list': new Animated.Value(0),
    'profile': new Animated.Value(0),
  }).current;

  const labelY = useRef<Record<TabKey, Animated.Value>>({
    'marketplace': new Animated.Value(6),
    'post-item': new Animated.Value(6),
    'chat-list': new Animated.Value(6),
    'profile': new Animated.Value(6),
  }).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  useEffect(() => {
    tabs.forEach(t => {
      if (t.key === activeKey) {
        if (reduceMotion) {
          scales[t.key].setValue(1.08);
          labelOpacities[t.key].setValue(1);
          labelY[t.key].setValue(0);
        } else {
          Animated.sequence([
            Animated.spring(scales[t.key], { toValue: 1.15, useNativeDriver: true, damping: 18, stiffness: 180 }),
            Animated.spring(scales[t.key], { toValue: 1.08, useNativeDriver: true, damping: 18, stiffness: 180 }),
          ]).start();
          setTimeout(() => {
            Animated.parallel([
              Animated.timing(labelOpacities[t.key], { toValue: 1, duration: 200, useNativeDriver: true }),
              Animated.timing(labelY[t.key], { toValue: 0, duration: 200, useNativeDriver: true }),
            ]).start();
          }, 60);
        }
      } else {
        if (reduceMotion) {
          scales[t.key].setValue(1);
          labelOpacities[t.key].setValue(0);
          labelY[t.key].setValue(6);
        } else {
          Animated.spring(scales[t.key], { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 180 }).start();
          Animated.parallel([
            Animated.timing(labelOpacities[t.key], { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(labelY[t.key], { toValue: 6, duration: 200, useNativeDriver: true }),
          ]).start();
        }
      }
    });

  }, [activeKey, tabs, scales, labelOpacities, labelY, reduceMotion]);

  const bottomPadding = Math.max(12, insets.bottom);

  const handlePress = (href: TabHref, label: string) => {
    const now = Date.now();
    const d = now - (lastPressRef.current || 0);
    lastPressRef.current = now;
    if (d < 150) return; // debounce
    Haptics.selectionAsync().catch(() => {});
    AccessibilityInfo.announceForAccessibility?.(`Selected: ${label}`);
    if (pathname !== href) router.replace(href);
  };

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}> 
      {tabs.map((t) => {
        const isActive = t.key === activeKey;
        const scale = scales[t.key];
        const tint = isActive ? COLORS.primary : 'rgba(17,24,39,0.64)';
        return (
          <View key={t.key} style={styles.navItem}>
            <TouchableOpacity
              onPress={() => handlePress(t.href, t.label)}
              accessibilityRole="button"
              accessibilityLabel={t.label}
              accessibilityState={{ selected: isActive }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.hit}
            >
              <Animated.View style={{ transform: [{ scale }] }}>
                <Feather name={t.icon as any} size={24} color={tint} />
              </Animated.View>
              <Animated.Text
                style={[
                  styles.navText,
                  { opacity: labelOpacities[t.key], transform: [{ translateY: labelY[t.key] }] },
                  isActive && styles.navTextActive,
                ]}
              >
                {t.label}
              </Animated.Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    position: 'relative',
  },
  hit: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  navText: {
    fontSize: 12,
    color: 'rgba(17,24,39,0.64)',
    marginTop: 6,
  },
  navTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
