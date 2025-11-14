import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../../theme/colors';

export default function ProfileTabs({ active, onChange }: { active: 'listings' | 'favorites'; onChange: (t: 'listings' | 'favorites') => void }) {
  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.tab} onPress={() => onChange('listings')}>
        <Text style={[styles.tabText, active === 'listings' && styles.tabTextActive]}>Listings</Text>
        {active === 'listings' && <View style={styles.indicator} />}
      </TouchableOpacity>
      <TouchableOpacity style={styles.tab} onPress={() => onChange('favorites')}>
        <Text style={[styles.tabText, active === 'favorites' && styles.tabTextActive]}>Favorites</Text>
        {active === 'favorites' && <View style={styles.indicator} />}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingHorizontal: 16 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 14, position: 'relative' },
  tabText: { color: '#6B7280', fontWeight: '600' },
  tabTextActive: { color: COLORS.primary },
  indicator: { position: 'absolute', left: '10%', right: '10%', bottom: 0, height: 3, backgroundColor: COLORS.primary, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
});

