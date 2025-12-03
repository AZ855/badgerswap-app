import { Feather } from '@expo/vector-icons';
import { Link, Stack, usePathname, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomNav from '../src/components/BottomNav';
import { ToastProvider } from '../src/components/ToastProvider';
import { AuthProvider, useAuth } from '../src/features/auth/AuthProvider';
import { useMessageNotifications } from '../src/features/chat/useMessageNotifications';
import { useMarketplaceNotifications } from '../src/features/marketplace/useMarketplaceNotifications';
import { RecommendationNotificationListener } from '../src/features/marketplace/useRecommendationNotifications';
import { DraftReminderListener } from '../src/features/posting/useDraftReminder';
import { COLORS } from '../src/theme/colors';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ToastProvider>
        <AuthProvider>
          <AuthGate>
            <LayoutContent />
          </AuthGate>
        </AuthProvider>
      </ToastProvider>
    </GestureHandlerRootView>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const firstSegment = segments[0] as string | undefined;
    const isAuthRoute = firstSegment === 'login' || firstSegment === 'register';
    const isRootOrIndex = !firstSegment || firstSegment === 'index';

    if (!user && !isAuthRoute) {
      router.replace('/login');
    } else if (user && (isAuthRoute || isRootOrIndex)) {
      router.replace('/marketplace');
    }
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

function LayoutContent() {
  const pathname = usePathname();
  const showNav =
    pathname?.startsWith('/marketplace') ||
    pathname?.startsWith('/post-item') ||
    pathname?.startsWith('/chat-list') ||
    pathname?.startsWith('/profile');
  const noBackStackOptions = {
    headerLeft: () => null,
    headerBackVisible: false,
    gestureEnabled: false,
    animation: 'none' as const,
  };

  return (
    <>
      <NotificationListeners />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: COLORS.primary,
          },
          headerTintColor: COLORS.white,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ title: 'Create Account' }} />
        <Stack.Screen
          name="marketplace"
          options={{
            title: 'BadgerSwap',
            ...noBackStackOptions,
          }}
        />
        <Stack.Screen name="item-detail" options={{ title: 'Item Details' }} />
        <Stack.Screen
          name="item-preview"
          options={{ title: 'Item preview', ...noBackStackOptions }}
        />
        <Stack.Screen
          name="post-item"
          options={{ title: 'Post Item', ...noBackStackOptions }}
        />
        <Stack.Screen
          name="chat-list"
          options={{ title: 'Messages', ...noBackStackOptions }}
        />
        <Stack.Screen name="chat" options={{ headerShown: false }} />
        <Stack.Screen
          name="conversation"
          options={{
            title: '',
            headerTitle: '',
          }}
        />
        <Stack.Screen
          name="report-listing/[itemId]"
          options={{
            title: 'Report this listing',
          }}
        />
        <Stack.Screen
          name="profile"
          options={{
            title: 'Profile',
            ...noBackStackOptions,
            headerRight: () => (
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <Link href="/settings" asChild>
                  <TouchableOpacity accessibilityLabel="Account menu">
                    <Feather name="menu" size={22} color={COLORS.white} />
                  </TouchableOpacity>
                </Link>
              </View>
            ),
          }}
        />
        <Stack.Screen name="edit-profile" options={{ title: 'Edit Profile' }} />
        <Stack.Screen name="account-center" options={{ title: 'Account Center' }} />
        <Stack.Screen name="change-password" options={{ title: 'Change password' }} />
        <Stack.Screen name="login-activity" options={{ title: 'Login activity' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings and activity' }} />
        <Stack.Screen name="preferences/index" options={{ title: 'Preferences' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="activity" options={{ title: 'Activity' }} />
        <Stack.Screen name="seller-profile" options={{ headerShown: false }} />
        <Stack.Screen name="account-privacy" options={{ title: 'Account privacy' }} />
        <Stack.Screen name="blocked" options={{ title: 'Blocked list' }} />
        <Stack.Screen name="block-user" options={{ title: '', headerTitle: 'Settings' }} />
      </Stack>
      {showNav && <BottomNav />}
    </>
  );
}

function NotificationListeners() {
  useMessageNotifications();
  useMarketplaceNotifications();
  return (
    <>
      <DraftReminderListener />
      <RecommendationNotificationListener />
    </>
  );
}
