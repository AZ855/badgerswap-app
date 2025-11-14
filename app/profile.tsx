import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../src/theme/colors';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Profile screen coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, paddingBottom: 96 },
  placeholder: { color: '#6B7280' },
});
