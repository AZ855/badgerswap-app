import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../theme/colors';

export type SnackbarProps = {
  visible: boolean;
  text: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  onPress?: () => void;
  onDismiss?: () => void;
  bottomOffset?: number;
};

export function Snackbar({
  visible,
  text,
  icon,
  actionLabel,
  onAction,
  onPress,
  onDismiss,
  bottomOffset = 0,
}: SnackbarProps) {
  if (!visible) return null;

  return (
    <View pointerEvents="box-none" style={[styles.host, { paddingBottom: 16 + bottomOffset }]}>
      <View style={styles.snackbar}>
        <TouchableOpacity
          style={styles.body}
          activeOpacity={onPress ? 0.9 : 1}
          onPress={onPress}
          accessibilityRole={onPress ? 'button' : undefined}
        >
          {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.text}>{text}</Text>
          </View>
        </TouchableOpacity>

        {actionLabel ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            onPress={(event) => {
              event.stopPropagation();
              onAction?.();
            }}
            style={styles.action}
            activeOpacity={0.88}
          >
            <Text style={styles.actionLabel}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}

        {onDismiss ? (
          <TouchableOpacity
            accessibilityLabel="Dismiss"
            onPress={(event) => {
              event.stopPropagation();
              onDismiss();
            }}
            style={styles.dismissBtn}
            hitSlop={8}
          >
            <Text style={styles.dismiss}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    zIndex: 50,
  },
  snackbar: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  action: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  actionLabel: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'uppercase',
  },
  dismissBtn: {
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  dismiss: {
    color: COLORS.white,
    fontSize: 16,
  },
});