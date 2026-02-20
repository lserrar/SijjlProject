import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '../../constants/theme';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background.primary },
        headerTintColor: colors.text.primary,
        headerTitleStyle: { fontFamily: 'Inter-SemiBold', fontSize: 17 },
        contentStyle: { backgroundColor: colors.background.primary },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Panel Admin' }} />
      <Stack.Screen name="audios" options={{ title: 'Gestion Audios' }} />
      <Stack.Screen name="scholars" options={{ title: 'Gestion Érudits' }} />
      <Stack.Screen name="courses" options={{ title: 'Gestion Cours' }} />
      <Stack.Screen name="audio-form" options={{ title: 'Formulaire Audio' }} />
      <Stack.Screen name="scholar-form" options={{ title: 'Formulaire Érudit' }} />
      <Stack.Screen name="course-form" options={{ title: 'Formulaire Cours' }} />
    </Stack>
  );
}
