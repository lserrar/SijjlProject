import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth, apiRequest } from '../../context/AuthContext';
import { colors, spacing, radius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface Thematique {
  id: string;
  name: string;
  order: number;
}

interface Bibliography {
  id: string;
  title: string;
  thematique_id: string;
  content_fr: string;
  content_en: string;
}

export default function BibliothequeScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [thematiques, setThematiques] = useState<Thematique[]>([]);
  const [bibliographies, setBibliographies] = useState<Bibliography[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBiblio, setSelectedBiblio] = useState<Bibliography | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [themRes, biblioRes] = await Promise.all([
        apiRequest('/thematiques', token),
        apiRequest('/bibliographies', token),
      ]);
      
      if (themRes.ok) {
        const data = await themRes.json();
        setThematiques(data.sort((a: Thematique, b: Thematique) => a.order - b.order));
      }
      if (biblioRes.ok) {
        const data = await biblioRes.json();
        setBibliographies(data);
      }
    } catch (e) {
      console.error('Failed to load data', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getBiblioByTheme = (themeId: string) => {
    return bibliographies.find(b => b.thematique_id === themeId);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
          <Text style={styles.loadingText}>Chargement de la bibliothèque...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // If a biblio is selected, show the detail view
  if (selectedBiblio) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.detailHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedBiblio(null)}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.detailTitle} numberOfLines={1}>
            {selectedBiblio.title.replace('Bibliographie : ', '')}
          </Text>
        </View>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.articleContent}>
            <View style={styles.articleSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="book" size={20} color={colors.brand.primary} />
                <Text style={styles.sectionTitle}>Ouvrages en français</Text>
              </View>
              <Text style={styles.articleText}>{selectedBiblio.content_fr}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.articleSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="globe" size={20} color={colors.brand.primary} />
                <Text style={styles.sectionTitle}>Essential readings (English)</Text>
              </View>
              <Text style={styles.articleText}>{selectedBiblio.content_en}</Text>
            </View>
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.brand.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Bibliothèque</Text>
          <Text style={styles.headerSubtitle}>
            Découvrez les ouvrages essentiels pour chaque thématique
          </Text>
        </View>

        {/* Articles List */}
        <View style={styles.articlesList}>
          {thematiques.map((theme, index) => {
            const biblio = getBiblioByTheme(theme.id);
            if (!biblio) return null;

            return (
              <TouchableOpacity
                key={theme.id}
                style={styles.articleCard}
                onPress={() => setSelectedBiblio(biblio)}
                activeOpacity={0.7}
              >
                <View style={styles.articleNumber}>
                  <Text style={styles.articleNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.articleInfo}>
                  <Text style={styles.articleName}>{theme.name}</Text>
                  <Text style={styles.articleHint}>Voir la bibliographie</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.text.tertiary}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },
  scroll: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  loadingText: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.text.secondary },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  articlesList: {
    paddingHorizontal: spacing.md,
  },
  articleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  articleNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brand.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  articleNumberText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: colors.brand.primary,
  },
  articleInfo: {
    flex: 1,
  },
  articleName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: 2,
  },
  articleHint: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: colors.text.secondary,
  },
  // Detail view styles
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    gap: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  detailTitle: {
    flex: 1,
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.text.primary,
  },
  articleContent: {
    padding: spacing.lg,
  },
  articleSection: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.text.primary,
  },
  articleText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginVertical: spacing.lg,
  },
});
