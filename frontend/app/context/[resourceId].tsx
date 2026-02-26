import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
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
  cursus_letter?: string;
  content: ContentBlock[];
}

// Cursus color mapping
const CURSUS_COLORS: Record<string, string> = {
  'A': '#04D182',
  'B': '#8B5CF6',
  'C': '#F59E0B',
  'D': '#EF4444',
  'E': '#3B82F6',
};

export default function ContextScreen() {
  const { resourceId } = useLocalSearchParams<{ resourceId: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resource, setResource] = useState<ContextResource | null>(null);

  const cursusColor = resource?.cursus_letter ? CURSUS_COLORS[resource.cursus_letter] || '#04D182' : '#04D182';

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
            <View key={index} style={styles.headingContainer}>
              <View style={[styles.headingDivider, { backgroundColor: `${cursusColor}40` }]} />
              <Text style={[styles.mainHeading, { color: cursusColor }]}>
                {block.text}
              </Text>
            </View>
          );
        case 'list_item':
          return (
            <View key={index} style={styles.listItem}>
              <Text style={[styles.listBullet, { color: cursusColor }]}>•</Text>
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
          <ActivityIndicator size="large" color={cursusColor} />
          <Text style={styles.loadingText}>Chargement du contexte historique...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !resource) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.headerBackBtn}>
            <Ionicons name="chevron-back" size={24} color="#F5F0E8" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerEyebrow}>ERREUR</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error || 'Ressource non trouvée'}</Text>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerBackBtn}>
          <Ionicons name="chevron-back" size={24} color="#F5F0E8" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerEyebrow, { color: cursusColor }]}>CONTEXTE HISTORIQUE</Text>
          <Text style={styles.headerTitle}>Module {resource.module_number}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Ionicons name="bookmark-outline" size={20} color="#F5F0E8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Block */}
        <View style={styles.titleBlock}>
          <View style={[styles.titleAccent, { backgroundColor: cursusColor }]} />
          <Text style={styles.contextTitle}>{resource.subject}</Text>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: '#1A1A1A' }]} />
          <View style={[styles.dividerDiamond, { backgroundColor: cursusColor }]} />
          <View style={[styles.dividerLine, { backgroundColor: cursusColor }]} />
        </View>

        {/* Cursus Info */}
        <Text style={[styles.sectionLabel, { color: cursusColor }]}>
          CURSUS {resource.cursus_letter || 'A'}
        </Text>
        <Text style={styles.moduleLabel}>
          Module {resource.module_number} — {resource.subject}
        </Text>

        {/* Document Content */}
        <View style={styles.contentContainer}>
          {renderContent()}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Sijill Project — Sciences Islamiques
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'EB Garamond',
    fontStyle: 'italic',
    fontSize: 16,
    color: '#777',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: 'EB Garamond',
    fontSize: 16,
    color: '#777',
    marginTop: 16,
    marginBottom: 20,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  backButtonText: {
    fontFamily: 'Cinzel',
    fontSize: 10,
    letterSpacing: 2,
    color: '#C9A84C',
    textTransform: 'uppercase',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
    backgroundColor: '#0A0A0A',
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerEyebrow: {
    fontFamily: 'Cinzel',
    fontSize: 8,
    letterSpacing: 4,
    color: '#04D182',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: 'Cinzel',
    fontSize: 12,
    color: '#F5F0E8',
    letterSpacing: 1,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  headerIconBtn: {
    padding: 8,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },

  // Title Block
  titleBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  titleAccent: {
    width: 3,
    height: '100%',
    minHeight: 40,
    marginRight: 16,
  },
  contextTitle: {
    flex: 1,
    fontFamily: 'Cinzel',
    fontSize: 20,
    fontWeight: '400',
    color: '#F5F0E8',
    lineHeight: 30,
    letterSpacing: 0.5,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerDiamond: {
    width: 8,
    height: 8,
    transform: [{ rotate: '45deg' }],
    marginHorizontal: 12,
  },

  // Section labels
  sectionLabel: {
    fontFamily: 'Cinzel',
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  moduleLabel: {
    fontFamily: 'Cinzel',
    fontSize: 13,
    color: '#C9A84C',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 32,
  },

  // Content
  contentContainer: {
    paddingBottom: 20,
  },
  headingContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
  headingDivider: {
    height: 1,
    marginBottom: 16,
  },
  mainHeading: {
    fontFamily: 'Cinzel',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  paragraph: {
    fontFamily: 'EB Garamond',
    fontSize: 17,
    color: '#F5F0E8',
    lineHeight: 30,
    marginBottom: 20,
    textAlign: 'justify',
  },
  listItem: {
    flexDirection: 'row',
    paddingLeft: 8,
    marginBottom: 12,
  },
  listBullet: {
    fontFamily: 'EB Garamond',
    fontSize: 17,
    marginRight: 12,
    lineHeight: 30,
  },
  listText: {
    flex: 1,
    fontFamily: 'EB Garamond',
    fontSize: 17,
    color: '#F5F0E8',
    lineHeight: 30,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: 40,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    marginTop: 20,
  },
  footerText: {
    fontFamily: 'Cinzel',
    fontSize: 10,
    color: '#555',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
