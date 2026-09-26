// Cinematic "generating" state — spinning icon + shimmer bar.
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { lovable } from '../theme';

interface Props {
  label?: string;
}

export function BuildingIndicator({ label = 'Generating code…' }: Props) {
  const barAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bar = Animated.loop(
      Animated.timing(barAnim, {
        toValue: 1,
        duration: 1600,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    const spin = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    bar.start();
    spin.start();
    return () => { bar.stop(); spin.stop(); };
  }, [barAnim, spinAnim]);

  const translateX = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 320],
  });
  const rotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={s.card}>
      <View style={s.row}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Feather name="loader" size={15} color={lovable.text} />
        </Animated.View>
        <Text style={s.label}>{label}</Text>
      </View>
      <View style={s.bar}>
        <Animated.View style={[s.barFill, { transform: [{ translateX }] }]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: lovable.card,
    borderWidth: 1,
    borderColor: lovable.cardBorder,
    borderRadius: 14,
    padding: lovable.space.md,
    gap: lovable.space.sm,
    marginVertical: lovable.space.sm,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    color: lovable.text,
    fontSize: lovable.font.md,
    fontWeight: lovable.weight.medium,
  },
  bar: {
    height: 3,
    borderRadius: 2,
    backgroundColor: lovable.pillBg,
    overflow: 'hidden',
  },
  barFill: {
    width: 60,
    height: '100%',
    borderRadius: 2,
    backgroundColor: lovable.text,
  },
});
