// app/change-password.tsx
import React from 'react';
import ChangePasswordScreen from '../src/components/ChangePasswordScreen';

// Re-export the actual screen component so Expo Router receives a valid React component.
export default function ChangePasswordRoute() {
  return <ChangePasswordScreen />;
}
