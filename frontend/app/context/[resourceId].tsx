import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../constants/theme';
import { API_URL } from '../../constants/api';
import { useAuth } from '../../context/AuthContext';

interface ContentBlock {
  type: 'heading' | 'paragraph' | 'list_item';
  text: string;
  level?: number;
  section?: string;
}

interface ContextResource {
  id: string;
  title: string;
  module_number: number;
  subject: string;
  content: ContentBlock[];
}

export default function ContextScreen() {
  const { resourceId } = useLocalSearchParams<{ resourceId: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resource, setResource] = useState<ContextResource | null>(null);

  useEffect(() => {
    const fetchResource = async () => {
      if (!resourceId) {
        setError('Ressource non spécifiée');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/resources/context/${resourceId}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          throw new Error('Ressource non trouvée');
        }

        const data = await response.json();
        setResource(data);
      } catch (e: any) {
        setError(e.message || 'Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };

    fetchResource();
  }, [resourceId, token]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const renderContent = () => {
    if (!resource?.content) return null;

    return resource.content.map((block, index) => {
      switch (block.type) {
        case 'heading':
          return (
            <Text
              key={index}
              style={[
                styles.heading,
                block.level === 1 ? styles.heading1 : styles.heading2,
              ]}
            >
              {block.text}
            </Text>
          );
        case 'list_item':
          return (
            <View key={index} style={styles.listItem}>
              <Text style={styles.listBullet}>•</Text>
              <Text style={styles.listText}>{block.text}</Text>
            </View>
          );
        case 'paragraph':
        default:
          return (
            <Text key={index} style={styles.paragraph}>
              {block.text}
            </Text>
          );
      }
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
          <Text style={styles.loadingText}>Chargement du contexte historique...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !resource) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Erreur</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.brand.error} />
          <Text style={styles.errorText}>{error || 'Ressource non trouvée'}</Text>
          <TouchableOpacity onPress={handleBack} style={styles.errorButton}>
            <Text style={styles.errorButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerModule}>Module {resource.module_number}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section */}
        <View style={styles.titleSection}>
          <View style={styles.iconContainer}>
            <Ionicons name="time-outline" size={32} color={colors.brand.secondary} />
          </View>
          <Text style={styles.title}>{resource.subject}</Text>
          <Text style={styles.subtitle}>Contexte historique</Text>
          <View style={styles.divider} />
        </View>

        {/* Document Content */}
        <View style={styles.documentContent}>
          {renderContent()}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Sijill Project — Études Islamiques
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
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
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Cinzel',
    fontSize: 14,
    color: colors.text.primary,
    letterSpacing: 1,
  },
  headerModule: {
    fontFamily: 'Cinzel',
    fontSize: 12,
    color: colors.brand.secondary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  titleSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  iconContainer: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${colors.brand.secondary}15`,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: 'Cinzel',
    fontSize: 24,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: 'EB Garamond',
    fontSize: 16,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    marginBottom: spacing.lg,
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: colors.brand.secondary,
  },
  documentContent: {
    paddingHorizontal: spacing.lg,
  },
  heading: {
    fontFamily: 'Cinzel',
    color: colors.brand.secondary,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  heading1: {
    fontSize: 18,
    letterSpacing: 1,
  },
  heading2: {
    fontSize: 15,
    letterSpacing: 0.5,
  },
  paragraph: {
    fontFamily: 'EB Garamond',
    fontSize: 17,
    color: colors.text.secondary,
    lineHeight: 28,
    marginBottom: spacing.md,
    textAlign: 'justify',
  },
  listItem: {
    flexDirection: 'row',
    paddingLeft: spacing.md,
    marginBottom: spacing.sm,
  },
  listBullet: {
    fontFamily: 'EB Garamond',
    fontSize: 17,
    color: colors.brand.primary,
    marginRight: spacing.sm,
    lineHeight: 28,
  },
  listText: {
    flex: 1,
    fontFamily: 'EB Garamond',
    fontSize: 17,
    color: colors.text.secondary,
    lineHeight: 28,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  footerText: {
    fontFamily: 'Cinzel',
    fontSize: 10,
    color: colors.text.tertiary,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
});
