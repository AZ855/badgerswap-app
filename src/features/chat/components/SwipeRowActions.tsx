import React from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { COLORS } from '../../../theme/colors';

const ACTION_WIDTH = 80;
const STACK_PHASE_END = 0.4;
const UNSTACK_PHASE_END = 0.8;

type SwipeRowActionsProps = {
  progress: Animated.AnimatedInterpolation<number>;
  isUnread: boolean;
  onToggleRead: () => void;
  onHide: () => void;
  onDelete: () => void;
};

const SwipeRowActions: React.FC<SwipeRowActionsProps> = ({
  progress,
  isUnread,
  onToggleRead,
  onHide,
  onDelete,
}) => {
  const buttons = [
    {
      key: 'mark',
      label: `Mark as\n${isUnread ? 'read' : 'unread'}`,
      style: [styles.swipeAction, styles.swipeMark],
      onPress: onToggleRead,
    },
    {
      key: 'hide',
      label: 'Hide',
      style: [styles.swipeAction, styles.swipeHide],
      onPress: onHide,
    },
    {
      key: 'delete',
      label: 'Delete',
      style: [styles.swipeAction, styles.swipeDelete],
      onPress: onDelete,
    },
  ];

  const totalWidth = ACTION_WIDTH * buttons.length;
  const containerTranslateX = progress.interpolate({
    inputRange: [0, STACK_PHASE_END],
    outputRange: [totalWidth, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.swipeActionsContainer, { width: totalWidth }]}>
      <Animated.View
        style={[
          styles.swipeActionsWrapper,
          { width: totalWidth, transform: [{ translateX: containerTranslateX }] },
        ]}
      >
        {buttons.map((button, index) => {
          const finalOffset = ACTION_WIDTH * (buttons.length - 1 - index);
          const buttonTranslate = progress.interpolate({
            inputRange: [0, STACK_PHASE_END, UNSTACK_PHASE_END, 1],
            outputRange: [0, 0, -finalOffset, -finalOffset],
            extrapolate: 'clamp',
          });
          const buttonOpacity = progress.interpolate({
            inputRange: [0, 0.05, STACK_PHASE_END],
            outputRange: [0, 0.4, 1],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={button.key}
              style={[
                styles.swipeActionWrapper,
                {
                  transform: [{ translateX: buttonTranslate }],
                  opacity: buttonOpacity,
                },
              ]}
            >
              <TouchableOpacity style={button.style} onPress={button.onPress}>
                <Text style={styles.swipeText}>{button.label}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </Animated.View>
    </View>
  );
};

export default SwipeRowActions;

const styles = StyleSheet.create({
  swipeActionsContainer: {
    height: '100%',
    overflow: 'hidden',
  },
  swipeActionsWrapper: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  swipeActionWrapper: {
    width: ACTION_WIDTH,
    height: '100%',
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
  },
  swipeAction: {
    width: ACTION_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeMark: {
    backgroundColor: '#007AFF',
  },
  swipeHide: {
    backgroundColor: '#FF9500',
  },
  swipeDelete: {
    backgroundColor: '#FF3B30',
  },
  swipeText: {
    color: COLORS.white,
    fontSize: 13,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
});
