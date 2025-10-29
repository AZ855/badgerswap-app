import { Stack } from 'expo-router';
import { COLORS } from '../src/theme/colors';

export default function RootLayout() {
  return (
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
          headerLeft: () => null, // Prevent back button
        }} 
      />
      <Stack.Screen name="item-detail" options={{ title: 'Item Details' }} />
      <Stack.Screen name="post-item" options={{ title: 'Post Item' }} />
      <Stack.Screen name="chat-list" options={{ title: 'Messages' }} />
      <Stack.Screen name="chat" options={{ title: 'Chat' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      <Stack.Screen name="edit-profile" options={{ title: 'Edit Profile' }} />
    </Stack>
  );
}
