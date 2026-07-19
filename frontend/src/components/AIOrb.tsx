import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  size?: number;
  active?: boolean; // pulses faster when listening/speaking
  colors?: [string, string, ...string[]];
}

/**
 * Signature JARVIS animated glowing orb.
 * Uses reanimated for 60fps breathing + rotation + glow.
 */
export function AIOrb({ size = 180, active = false, colors = ['#22D3EE', '#6366F1', '#8B5CF6'] }: Props) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0.5);
  const rot = useSharedValue(0);

  useEffect(() => {
    const speed = active ? 900 : 1800;
    scale.value = withRepeat(
      withSequence(
        withTiming(active ? 1.08 : 1.04, { duration: speed, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.96, { duration: speed, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: speed, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.4, { duration: speed, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
    rot.value = withRepeat(withTiming(360, { duration: 24000, easing: Easing.linear }), -1, false);
  }, [active, scale, glow, rot]);

  const outerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: 0.35 + glow.value * 0.5,
  }));
  const midStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.92 + glow.value * 0.08 }, { rotate: `${rot.value}deg` }],
  }));
  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.85 + (1 - glow.value) * 0.06 }],
  }));

  return (
    <View style={[styles.wrap, { width: size * 1.6, height: size * 1.6 }]} pointerEvents="none">
      <Animated.View style={[styles.glow, { width: size * 1.6, height: size * 1.6, borderRadius: size * 0.8, backgroundColor: colors[0] + '33' }, outerStyle]} />
      <Animated.View style={[{ width: size * 1.15, height: size * 1.15, borderRadius: size * 0.6, overflow: 'hidden' }, midStyle]}>
        <LinearGradient
          colors={colors}
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 0.9, y: 0.9 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[styles.core, { width: size * 0.72, height: size * 0.72, borderRadius: size * 0.36 }, innerStyle]}>
        <LinearGradient
          colors={['#ffffff55', '#ffffff11']}
          start={{ x: 0.2, y: 0.15 }}
          end={{ x: 0.8, y: 0.9 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
  core: {
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: '#ffffff10',
  },
});
