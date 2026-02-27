import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { colors, spacing } from '../../constants/theme';
import { API_URL } from '../../constants/api';

export default function TimelineScreen() {
  const { cursusId, file } = useLocalSearchParams<{ cursusId: string; file?: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract cursus letter from cursusId (e.g., "cursus-falsafa" -> "A")
  const getCursusLetter = (id: string): string => {
    const mapping: Record<string, string> = {
      'cursus-falsafa': 'A',
      'cursus-theologie': 'B',
      'cursus-sciences-islamiques': 'C',
      'cursus-arts': 'D',
      'cursus-spiritualites': 'E',
    };
    return mapping[id] || id.toUpperCase();
  };

  const cursusLetter = getCursusLetter(cursusId || '');
  
  // If a specific file is provided, use the file endpoint; otherwise, use the legacy letter endpoint
  const timelineUrl = file 
    ? `${API_URL}/api/timeline/file/${encodeURIComponent(file)}`
    : `${API_URL}/api/timeline/${cursusLetter}`;

  useEffect(() => {
    // For web, we'll use an iframe to display the HTML
    if (Platform.OS === 'web') {
      setLoading(false);
    }
  }, []);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  // Native mobile version using WebView
  if (Platform.OS !== 'web') {
    return (
      <SafeAreaView style={styles.safe}>
        {/* Floating back button */}
        <TouchableOpacity 
          onPress={handleBack} 
          style={styles.floatingBackButton}
          data-testid="timeline-back-btn"
        >
          <Ionicons name="close" size={24} color={colors.text.primary} />
        </TouchableOpacity>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.brand.primary} />
            <Text style={styles.loadingText}>Chargement de la frise...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color={colors.brand.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={handleBack} style={styles.errorButton}>
              <Text style={styles.errorButtonText}>Retour</Text>
            </TouchableOpacity>
          </View>
        )}

        <WebView
          source={{ uri: timelineUrl }}
          style={styles.webview}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            setLoading(false);
            setError('Impossible de charger la frise chronologique');
            console.warn('WebView error: ', nativeEvent);
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          allowsFullscreenVideo={true}
        />
      </SafeAreaView>
    );
  }

  // Web version using iframe
  return (
    <SafeAreaView style={styles.safe}>
      {/* Floating back button */}
      <TouchableOpacity 
        onPress={handleBack} 
        style={styles.floatingBackButton}
        data-testid="timeline-back-btn"
      >
        <Ionicons name="close" size={24} color={colors.text.primary} />
      </TouchableOpacity>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
          <Text style={styles.loadingText}>Chargement de la frise...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.brand.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={handleBack} style={styles.errorButton}>
            <Text style={styles.errorButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Full-screen iframe for the timeline */}
      <iframe
        src={timelineUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: loading ? 'none' : 'block',
        }}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError('Impossible de charger la frise chronologique');
        }}
        title="Frise Chronologique"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontFamily: 'Cinzel',
    fontSize: 16,
    color: colors.text.primary,
    letterSpacing: 1,
  },
  floatingBackButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1000,
    backgroundColor: 'rgba(10, 10, 10, 0.8)',
    padding: 12,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingText: {
    fontFamily: 'EB Garamond',
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontFamily: 'EB Garamond',
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  errorButton: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  errorButtonText: {
    fontFamily: 'Cinzel',
    fontSize: 12,
    color: '#0A0A0A',
    letterSpacing: 2,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  message: {
    fontFamily: 'EB Garamond',
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 24,
  },
});
