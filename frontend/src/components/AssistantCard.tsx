import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AssistantDef } from '@/src/config/assistants';
import { useTheme } from '@/src/context/ThemeContext';
import { radius, spacing, fontSize } from '@/src/theme/colors';

interface Props {
  a: AssistantDef;
  onPress?: (a: AssistantDef) => void;
  compact?: boolean;
}

export function AssistantCard({ a, onPress, compact }: Props) {
  const { c } = useTheme();
  const disabled = a.status === 'coming_soon';

  return (
    <Pressable
      testID={`assistant-card-${a.id}`}
      onPress={() => onPress?.(a)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: c.surface,
          borderColor: pressed ? c.primary : c.border,
          opacity: disabled ? 0.7 : 1,
          padding: compact ? spacing.md : spacing.lg,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: a.color + '22' }]}>
        <Ionicons name={a.icon} size={compact ? 20 : 24} color={a.color} />
      </View>
      <Text style={[styles.title, { color: c.text, fontSize: compact ? fontSize.md : fontSize.lg }]} numberOfLines={1}>
        {a.name}
      </Text>
      {!compact && (
        <Text style={[styles.tag, { color: c.textMuted }]} numberOfLines={2}>
          {a.tagline}
        </Text>
      )}

      {a.status !== 'active' && (
        <View style={[styles.badge, { backgroundColor: a.status === 'beta' ? c.warning + 'cc' : c.textDim }]}>
          <Text style={styles.badgeText}>{a.status === 'beta' ? 'BETA' : 'SOON'}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radius.xl,
    borderWidth: 1,
    minHeight: 118,
    position: 'relative',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontWeight: '700',
    marginBottom: 2,
  },
  tag: {
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
