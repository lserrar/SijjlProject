import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Platform, StatusBar, Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { apiRequest, useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const { width: SW } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 24;

const CURSUS_COLORS: Record<string, string> = {
  'cursus-falsafa': '#04D182',
  'cursus-theologie': '#8B5CF6',
  'cursus-sciences-islamiques': '#F59E0B',
  'cursus-arts': '#EC4899',
  'cursus-spiritualites': '#06B6D4',
};

interface Bibliography {
  id: string;
  title: string;
  content: string;
  module_number?: number;
  course_id?: string;
  cursus_id?: string;
}

export default function BibliographyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();

  const [biblio, setBiblio] = useState<Bibliography | null>(null);
  const [loading, setLoading] = useState(true);

  const cursusColor = biblio?.cursus_id ? CURSUS_COLORS[biblio.cursus_id] || '#04D182' : '#04D182';

  useEffect(() => {
    const loadBiblio = async () => {
      try {
        const res = await apiRequest(`/bibliographies/${id}`, token);
        if (res.ok) {
          const data = await res.json();
          setBiblio(data);
        }
      } catch (e) {
        console.error('Load bibliography error:', e);
      } finally {
        setLoading(false);
      }
    };
    loadBiblio();
  }, [id, token]);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#04D182" />
      </View>
    );
  }

  if (!biblio) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={styles.errorText}>Bibliographie non trouvée</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Parse content into sections
  const renderContent = () => {
    const paragraphs = biblio.content.split('\n\n');
    
    return paragraphs.map((paragraph, idx) => {
      const trimmed = paragraph.trim();
      
      // Handle markdown headers (## or ###)
      if (trimmed.startsWith('##')) {
        const headingText = trimmed.replace(/^#+\s*/, '');
        const isMainHeading = trimmed.startsWith('## ') && !trimmed.startsWith('### ');
        
        return (
          <View key={idx} style={styles.headingContainer}>
            {idx > 0 && <View style={[styles.headingDivider, { backgroundColor: `${cursusColor}33` }]} />}
            <Text style={[
              isMainHeading ? styles.mainHeading : styles.subHeading,
              { color: isMainHeading ? '#C9A84C' : cursusColor }
            ]}>
              {headingText}
            </Text>
          </View>
        );
      }
      
      // Skip empty paragraphs
      if (!trimmed) return null;
      
      // Regular paragraph
      return (
        <Text key={idx} style={styles.paragraph}>
          {trimmed}
        </Text>
      );
    });
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" translucent />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: STATUS_BAR_HEIGHT + 10 }]}>
        <TouchableOpacity
          testID="biblio-back-btn"
          style={styles.headerBackBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={20} color="rgba(245,240,232,0.7)" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerEyebrow}>BIBLIOGRAPHIE</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Cours {biblio.module_number ? String(biblio.module_number).padStart(2, '0') : ''}
          </Text>
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Ionicons name="bookmark-outline" size={20} color="rgba(245,240,232,0.5)" />
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
          <Text style={styles.biblioTitle}>{biblio.title}</Text>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: `${cursusColor}4D` }]} />
          <View style={[styles.dividerDiamond, { backgroundColor: cursusColor }]} />
          <View style={[styles.dividerLine, { backgroundColor: `${cursusColor}4D` }]} />
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          {renderContent()}
        </View>

        {/* Footer spacing */}
        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: 'EBGaramond',
    fontSize: 16,
    color: '#777',
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
    paddingBottom: 16,
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
    fontSize: 7,
    letterSpacing: 4,
    color: '#C9A84C',
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
  biblioTitle: {
    flex: 1,
    fontFamily: 'Cinzel',
    fontSize: 18,
    fontWeight: '400',
    color: '#F5F0E8',
    lineHeight: 28,
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

  // Content
  contentContainer: {
    paddingBottom: 20,
  },
  headingContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  headingDivider: {
    height: 1,
    marginBottom: 20,
  },
  mainHeading: {
    fontFamily: 'Cinzel',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  subHeading: {
    fontFamily: 'Cinzel',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1,
  },
  paragraph: {
    fontFamily: 'EBGaramond',
    fontSize: 17,
    color: 'rgba(245,240,232,0.85)',
    lineHeight: 30,
    marginBottom: 20,
    textAlign: 'justify',
  },
});
