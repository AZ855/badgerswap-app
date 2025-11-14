import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { usePathname, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';

type TabKey = 'marketplace' | 'post-item' | 'chat-list' | 'profile';

export default function BottomNav() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const tabs = useMemo(
    () => [
      { key: 'marketplace' as TabKey, label: 'Home', icon: 'home' as const, href: '/marketplace' },
      { key: 'post-item' as TabKey, label: 'Post', icon: 'plus-circle' as const, href: '/post-item' },
      { key: 'chat-list' as TabKey, label: 'Messages', icon: 'message-circle' as const, href: '/chat-list' },
      { key: 'profile' as TabKey, label: 'Profile', icon: 'user' as const, href: '/profile' },
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

  useEffect(() => {
    tabs.forEach(t => {
      Animated.spring(scales[t.key], {
        toValue: t.key === activeKey ? 1 : 0,
        useNativeDriver: true,
        friction: 6,
        tension: 120,
      }).start();
    });
  }, [activeKey, scales, tabs]);

  const bottomPadding = Math.max(12, insets.bottom);

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}> 
      {tabs.map((t) => {
        const isActive = t.key === activeKey;
        const scale = scales[t.key].interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
        const tint = isActive ? COLORS.primary : '#6B7280';
        return (
          <TouchableOpacity
            key={t.key}
            style={styles.navItem}
            onPress={() => router.push(t.href)}
            accessibilityRole="button"
            accessibilityLabel={t.label}
          >
            <Animated.View style={{ transform: [{ scale }] }}>
              <Feather name={t.icon} size={24} color={tint} />
            </Animated.View>
            <Text style={[styles.navText, isActive && styles.navTextActive]}>{t.label}</Text>
          </TouchableOpacity>
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
    paddingVertical: 4,
  },
  navText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  navTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

