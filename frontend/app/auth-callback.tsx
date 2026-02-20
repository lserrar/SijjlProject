import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, Text, StyleSheet, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../constants/theme';

export default function AuthCallback() {
  const router = useRouter();
  const { exchangeGoogleSession, isAuthenticated } = useAuth();

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const params = new URLSearchParams(hash.replace('#', ''));
      const sessionId = params.get('session_id');
      if (sessionId) {
        exchangeGoogleSession(sessionId)
          .then(() => router.replace('/(tabs)'))
          .catch(() => router.replace('/(auth)/login'));
      } else {
        router.replace('/(auth)/login');
      }
    } else {
      router.replace(isAuthenticated ? '/(tabs)' : '/(auth)/login');
    }
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.brand.primary} />
      <Text style={styles.text}>Authentification en cours...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  text: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: colors.text.secondary,
  },
});
