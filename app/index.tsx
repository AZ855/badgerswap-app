import { Redirect, useRootNavigationState } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const rootNavigation = useRootNavigationState();

  if (rootNavigation?.key == null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Redirect href="/marketplace" />;
  // return <Redirect href="/login" />;
}
