import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { COLORS } from '../src/theme/colors';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>This is a placeholder screen.</Text>

      <View style={{ height: 24 }} />

      <Link href="/activity" asChild>
        <TouchableOpacity style={styles.btn}>
          <Text style={styles.btnText}>View Activity</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 8, color: '#6B7280' },
  btn: { marginTop: 16, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  btnText: { color: COLORS.white, fontWeight: '700' },
});

