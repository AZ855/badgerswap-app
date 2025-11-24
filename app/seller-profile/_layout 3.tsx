import { Stack } from 'expo-router';
import React from 'react';

export default function SellerProfileLayout() {
  return (
    <Stack>
      <Stack.Screen name="[userId]" options={{ title: 'Seller Profile' }} />
    </Stack>
  );
}