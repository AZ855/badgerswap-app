import React from 'react';
import { Stack, usePathname, Link } from 'expo-router';
import { COLORS } from '../src/theme/colors';
import BottomNav from '../src/components/BottomNav';
import { View, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function RootLayout() {
  const pathname = usePathname();
  const showNav = pathname?.startsWith('/marketplace') ||
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
    </Stack>
    {showNav && <BottomNav />}
    </>
  );
}
