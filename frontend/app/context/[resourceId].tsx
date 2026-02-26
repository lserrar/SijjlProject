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

// Section titles to detect
const SECTION_TITLES = [
  'Contexte dynastique',
  'Contexte intellectuel',
  'Chronologie biographique',
];

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

  // Parse content to extract module info, thinker name, and sections
  const parseContent = () => {
    if (!resource?.content) return { moduleInfo: '', thinkerName: '', epochInfo: '', sections: [] };

    const content = resource.content;
    let moduleInfo = '';
    let thinkerName = '';
    let epochInfo = '';
    const sections: { title: string; content: ContentBlock[] }[] = [];
    let currentSection: { title: string; content: ContentBlock[] } | null = null;

    for (let i = 0; i < content.length; i++) {
      const block = content[i];
      const text = block.text.trim();

      // First paragraph is usually module info
      if (i === 0 && text.startsWith('Module')) {
        moduleInfo = text;
        continue;
      }

      // Second paragraph is usually thinker name with dates
      if (i === 1) {
        thinkerName = text;
        continue;
      }

      // Third paragraph is usually epoch info (contains '·')
      if (i === 2 && (text.includes('·') || text.includes('Époque') || text.includes('epoque'))) {
        epochInfo = text;
        continue;
      }

      // Check if this is a section title (exact match, case-insensitive)
      const normalizedText = text.toLowerCase().trim();
      const isSectionTitle = SECTION_TITLES.some(title => 
        normalizedText === title.toLowerCase().trim()
      );

      if (isSectionTitle) {
        // Save previous section if exists
        if (currentSection && currentSection.content.length > 0) {
          sections.push(currentSection);
        }
        // Start new section with proper title formatting
        const properTitle = SECTION_TITLES.find(t => t.toLowerCase() === normalizedText) || text;
        currentSection = { title: properTitle, content: [] };
      } else if (currentSection) {
        // Add to current section
        currentSection.content.push(block);
      } else {
        // Before first section title - create intro section if needed
        if (sections.length === 0) {
          currentSection = { title: 'Introduction', content: [block] };
        }
      }
    }

    // Don't forget the last section
    if (currentSection && currentSection.content.length > 0) {
      sections.push(currentSection);
    }

    return { moduleInfo, thinkerName, epochInfo, sections };
  };

  const { moduleInfo, thinkerName, epochInfo, sections } = parseContent();

  const renderSectionContent = (content: ContentBlock[]) => {
    return content.map((block, index) => {
      switch (block.type) {
        case 'heading':
          return (
            <Text key={index} style={styles.subHeading}>
              {block.text}
            </Text>
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
          <Text style={styles.headerTitle}>Cursus {resource.cursus_letter || 'A'}</Text>
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
        {/* Hero Section - Module Info */}
        {moduleInfo && (
          <View style={styles.moduleInfoContainer}>
            <Text style={[styles.moduleInfoText, { color: cursusColor }]}>
              {moduleInfo}
            </Text>
          </View>
        )}

        {/* Thinker Name - Centered */}
        <View style={styles.thinkerContainer}>
          <Text style={styles.thinkerName}>
            {thinkerName || resource.subject}
          </Text>
          {epochInfo && (
            <Text style={styles.epochInfo}>{epochInfo}</Text>
          )}
        </View>

        {/* Decorative Divider */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: '#222' }]} />
          <View style={[styles.dividerDiamond, { backgroundColor: cursusColor }]} />
          <View style={[styles.dividerLine, { backgroundColor: '#222' }]} />
        </View>

        {/* Document Sections */}
        {sections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.sectionContainer}>
            {section.title !== 'Introduction' && (
              <View style={styles.sectionTitleContainer}>
                <View style={[styles.sectionTitleBar, { backgroundColor: cursusColor }]} />
                <Text style={[styles.sectionTitle, { color: cursusColor }]}>
                  {section.title}
                </Text>
              </View>
            )}
            <View style={styles.sectionContent}>
              {renderSectionContent(section.content)}
            </View>
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />
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
    fontSize: 11,
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
    fontSize: 9,
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
    paddingBottom: 60,
  },

  // Module Info
  moduleInfoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  moduleInfoText: {
    fontFamily: 'Cinzel',
    fontSize: 12,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  // Thinker Section
  thinkerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  thinkerName: {
    fontFamily: 'Cinzel',
    fontSize: 24,
    fontWeight: '400',
    color: '#F5F0E8',
    textAlign: 'center',
    letterSpacing: 1,
    lineHeight: 34,
    marginBottom: 8,
  },
  epochInfo: {
    fontFamily: 'EB Garamond',
    fontStyle: 'italic',
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    letterSpacing: 1,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerDiamond: {
    width: 8,
    height: 8,
    transform: [{ rotate: '45deg' }],
    marginHorizontal: 16,
  },

  // Sections
  sectionContainer: {
    marginBottom: 32,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  sectionTitleBar: {
    width: 3,
    height: 18,
    marginRight: 12,
  },
  sectionTitle: {
    fontFamily: 'Cinzel',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  sectionContent: {
    paddingLeft: 0,
  },
  subHeading: {
    fontFamily: 'Cinzel',
    fontSize: 13,
    fontWeight: '600',
    color: '#C9A84C',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 12,
  },
  paragraph: {
    fontFamily: 'EB Garamond',
    fontSize: 17,
    color: '#E8E4DC',
    lineHeight: 30,
    marginBottom: 18,
    textAlign: 'justify',
  },
  listItem: {
    flexDirection: 'row',
    paddingLeft: 4,
    marginBottom: 14,
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
    color: '#E8E4DC',
    lineHeight: 30,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: 40,
    marginTop: 20,
  },
  footerDivider: {
    width: 60,
    height: 1,
    backgroundColor: '#222',
    marginBottom: 20,
  },
  footerText: {
    fontFamily: 'Cinzel',
    fontSize: 10,
    color: '#555',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});
