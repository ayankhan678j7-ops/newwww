import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';

interface Props {
  children: React.ReactNode;
  intensity?: number;
  style?: ViewStyle | ViewStyle[];
}

export function Glass({ children, intensity = 40, style }: Props) {
  const { scheme, c } = useTheme();
  return (
    <View style={[styles.wrap, { borderColor: scheme === 'dark' ? '#ffffff15' : '#00000010' }, style]}>
      <BlurView intensity={intensity} tint={scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: c.glass }]} />
      <View style={{ position: 'relative' }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    overflow: 'hidden',
  },
});
