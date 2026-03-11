import { useEffect, useState, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  DMSans_400Regular,
  DMSans_500Medium,
} from '@expo-google-fonts/dm-sans';
import {
  Cinzel_400Regular,
  Cinzel_600SemiBold,
} from '@expo-google-fonts/cinzel';
import {
  EBGaramond_400Regular,
  EBGaramond_500Medium,
  EBGaramond_400Regular_Italic,
} from '@expo-google-fonts/eb-garamond';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '../context/AuthContext';
import { PlayerProvider } from '../context/PlayerContext';
import React from 'react';

const SPLASH_DURATION = 3000; // 3 seconds

// Module-level flag - set immediately when module loads
let _splashCompleted = false;

// Keep the native splash screen visible while we load fonts
SplashScreen.preventAutoHideAsync();

// Simple Splash Component - No animation, shows only once
function SimpleSplash({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, SPLASH_DURATION);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <View style={splashStyles.container}>
      <StatusBar style="light" />
      <View style={splashStyles.logoContainer}>
        <Text style={splashStyles.logoSijill}>SIJILL</Text>
        <View style={splashStyles.projectRow}>
          <Text style={splashStyles.logoProject}>PROJECT</Text>
          <View style={splashStyles.greenDot} />
        </View>
      </View>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: -50,
  },
  logoSijill: {
    fontFamily: 'Cinzel',
    fontSize: 44,
    fontWeight: '400',
    color: '#F5F0E8',
    letterSpacing: 12,
    marginBottom: 4,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoProject: {
    fontFamily: 'Cinzel',
    fontSize: 44,
    fontWeight: '400',
    color: '#F5F0E8',
    letterSpacing: 4,
  },
  greenDot: {
    width: 12,
    height: 12,
    backgroundColor: '#04D182',
    borderRadius: 6,
    marginLeft: 6,
  },
});

export default function RootLayout() {
  // Show splash only if not already completed this session
  const [showSplash, setShowSplash] = useState(() => !_splashCompleted);
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'DMSans-Regular': DMSans_400Regular,
    'DMSans-Medium': DMSans_500Medium,
    'Cinzel': Cinzel_400Regular,
    'Cinzel-SemiBold': Cinzel_600SemiBold,
    'EB Garamond': EBGaramond_400Regular,
    'EB Garamond Medium': EBGaramond_500Medium,
    'EB Garamond Italic': EBGaramond_400Regular_Italic,
  });

  useEffect(() => {
    // Hide the native splash screen once fonts are loaded
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  const handleSplashComplete = () => {
    _splashCompleted = true; // Mark as completed at module level
    setShowSplash(false);
  };

  if (!fontsLoaded && !fontError) {
    return null;
  }

  // Show our custom splash BEFORE the app content (only once)
  if (showSplash) {
    return (
      <SimpleSplash onComplete={handleSplashComplete} />
    );
  }

  return (
    <AuthProvider>
      <PlayerProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="index" options={{ animation: 'none' }} />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth-callback" />
          <Stack.Screen name="cursus/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="audio/[id]" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
          <Stack.Screen name="course/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="article/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="scholar/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="search" options={{ animation: 'slide_from_right' }} />
        </Stack>
      </PlayerProvider>
    </AuthProvider>
  );
}
