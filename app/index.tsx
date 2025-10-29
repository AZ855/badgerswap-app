import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { COLORS } from '../src/theme/colors';

export default function Index() {
  useEffect(() => {
    // Redirect to login screen on app start
    router.replace('/login');
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}
