import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/context/ThemeContext';

export default function TabsLayout() {
  const { c, scheme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          elevation: 0,
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom,
          backgroundColor: 'transparent',
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            <BlurView intensity={40} tint={scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: c.glass, borderTopWidth: 1, borderTopColor: c.border }]} />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses" size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="voice"
        options={{
          title: 'Voice',
          tabBarIcon: ({ color, size }) => <Ionicons name="mic-circle" size={(size ?? 22) + 4} color={color} />,
        }}
      />
      <Tabs.Screen
        name="memory"
        options={{
          title: 'Memory',
          tabBarIcon: ({ color, size }) => <Ionicons name="server" size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" size={(size ?? 22) + 4} color={color} />,
        }}
      />
    </Tabs>
  );
}
