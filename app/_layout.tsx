import { Feather } from '@expo/vector-icons';
import { Link, Stack, usePathname, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import BottomNav from '../src/components/BottomNav';
import { AuthProvider, useAuth } from '../src/features/auth/AuthProvider';
import { COLORS } from '../src/theme/colors';

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGate>
        <LayoutContent />
      </AuthGate>
    </AuthProvider>
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

  return (
    <>
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
            headerLeft: () => null,
            gestureEnabled: false,
            animation: 'none',
          }}
        />
        <Stack.Screen name="item-detail" options={{ title: 'Item Details' }} />
        <Stack.Screen name="post-item" options={{ title: 'Post Item', gestureEnabled: false, animation: 'none' }} />
        <Stack.Screen name="chat-list" options={{ title: 'Messages', gestureEnabled: false, animation: 'none' }} />
        <Stack.Screen name="chat" options={{ title: 'Chat' }} />
        <Stack.Screen
          name="profile"
          options={{
            title: 'Profile',
            gestureEnabled: false,
            animation: 'none',
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
        <Stack.Screen name="activity" options={{ title: 'Activity' }} />
      </Stack>
      {showNav && <BottomNav />}
    </>
  );
}
