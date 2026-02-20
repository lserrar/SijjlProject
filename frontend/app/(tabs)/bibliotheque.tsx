import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth, apiRequest } from '../../context/AuthContext';
import { colors, spacing, radius } from '../../constants/theme';
import { formatDate, getTypeLabel } from '../../constants/mockData';
import { Ionicons } from '@expo/vector-icons';

const TABS = ['Sauvegardés', 'En cours', 'Bibliographie'];

export default function BibliothequeScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [favResp, progResp] = await Promise.all([
        apiRequest('/user/favorites', token),
        apiRequest('/user/progress', token),
      ]);
      const favData = await favResp.json();
      const progData = await progResp.json();
      setFavorites(Array.isArray(favData) ? favData : []);
      setProgress(Array.isArray(progData) ? progData : []);
    } catch (e) {
      console.error('Library fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const navigateToContent = (item: any, type: string) => {
    if (type === 'course') router.push(`/course/${item.id}` as any);
    else if (['podcast', 'lecture', 'quran', 'documentary', 'audio'].includes(type)) router.push(`/audio/${item.id}` as any);
    else if (type === 'article') router.push(`/article/${item.id}` as any);
  };

  const removeFavorite = async (contentId: string, contentType: string) => {
    await apiRequest(`/user/favorites/${contentType}/${contentId}`, token, { method: 'DELETE' });
    setFavorites(prev => prev.filter(f => f.favorite.content_id !== contentId));
  };

  const inProgressItems = progress.filter(p => p.progress > 0 && p.progress < 0.95);

  // Curated bibliography section
  const bibliography = [
    { id: 'bib-1', title: 'Tahafut al-Falasifa', author: 'Al-Ghazali', type: 'book', emoji: '📚' },
    { id: 'bib-2', title: 'La Muqaddima', author: 'Ibn Khaldoun', type: 'book', emoji: '📚' },
    { id: 'bib-3', title: 'Le Livre de la Délivrance de l\'Erreur', author: 'Al-Ghazali', type: 'book', emoji: '📚' },
    { id: 'bib-4', title: 'Discours Décisif', author: 'Averroès (Ibn Rushd)', type: 'book', emoji: '📚' },
    { id: 'bib-5', title: 'Masnavi', author: 'Jalal ad-Din Rumi', type: 'book', emoji: '📚' },
    { id: 'bib-6', title: 'Al-Andalous : L\'Islam médiéval en Espagne', author: 'María Rosa Menocal', type: 'book', emoji: '📚' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Ma Bibliothèque</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map((tab, i) => (
          <TouchableOpacity
            key={tab}
            testID={`library-tab-${i}`}
            style={[styles.tab, activeTab === i && styles.tabActive]}
            onPress={() => setActiveTab(i)}
          >
            <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
        >
          {/* Tab 0: Saved */}
          {activeTab === 0 && (
            <View style={styles.tabContent}>
              {favorites.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="heart-outline" size={48} color={colors.text.tertiary} />
                  <Text style={styles.emptyTitle}>Aucun contenu sauvegardé</Text>
                  <Text style={styles.emptySubtitle}>Sauvegardez des cours, podcasts et articles pour les retrouver ici</Text>
                </View>
              ) : (
                favorites.map((fav) => {
                  const content = fav.content;
                  return (
                    <TouchableOpacity
                      key={fav.favorite.content_id}
                      testID={`library-fav-${content.id}`}
                      style={styles.contentRow}
                      onPress={() => navigateToContent(content, content.type)}
                    >
                      <Image source={{ uri: content.thumbnail }} style={styles.contentThumb} />
                      <View style={styles.contentInfo}>
                        <View style={styles.typeRow}>
                          <Text style={styles.typeTag}>{getTypeLabel(content.type).toUpperCase()}</Text>
                        </View>
                        <Text style={styles.contentTitle} numberOfLines={2}>{content.title}</Text>
                        <Text style={styles.contentScholar}>{content.scholar_name}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => removeFavorite(content.id, content.type)}
                        style={styles.heartBtn}
                      >
                        <Ionicons name="heart" size={20} color={colors.brand.primary} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          )}

          {/* Tab 1: In Progress */}
          {activeTab === 1 && (
            <View style={styles.tabContent}>
              {inProgressItems.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="play-circle-outline" size={48} color={colors.text.tertiary} />
                  <Text style={styles.emptyTitle}>Aucun contenu en cours</Text>
                  <Text style={styles.emptySubtitle}>Commencez un cours ou un podcast pour suivre votre progression</Text>
                </View>
              ) : (
                inProgressItems.map((item) => (
                  <View key={item.content_id} style={styles.contentRow}>
                    <View style={styles.progressCircle}>
                      <Text style={styles.progressPct}>{Math.round(item.progress * 100)}%</Text>
                    </View>
                    <View style={styles.contentInfo}>
                      <Text style={styles.typeTag}>{item.content_type.toUpperCase()}</Text>
                      <Text style={styles.contentTitle}>{item.content_id}</Text>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${item.progress * 100}%` }]} />
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* Tab 2: Bibliography */}
          {activeTab === 2 && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionSubtitle}>
                Œuvres essentielles recommandées par nos érudits
              </Text>
              {bibliography.map((book) => (
                <View key={book.id} testID={`library-book-${book.id}`} style={styles.bookCard}>
                  <View style={styles.bookEmoji}>
                    <Text style={{ fontSize: 28 }}>{book.emoji}</Text>
                  </View>
                  <View style={styles.bookInfo}>
                    <Text style={styles.bookTitle}>{book.title}</Text>
                    <Text style={styles.bookAuthor}>{book.author}</Text>
                    <View style={styles.bookTag}>
                      <Text style={styles.bookTagText}>OUVRAGE FONDAMENTAL</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: { fontFamily: 'Inter-Bold', fontSize: 28, color: colors.text.primary, letterSpacing: -0.5 },
  tabRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.background.card },
  tabActive: { backgroundColor: colors.text.primary },
  tabText: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.text.secondary },
  tabTextActive: { color: colors.background.primary },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  tabContent: { paddingHorizontal: spacing.lg },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontFamily: 'Inter-SemiBold', fontSize: 17, color: colors.text.primary },
  emptySubtitle: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.text.secondary, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  contentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border.subtle, gap: spacing.md },
  contentThumb: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.background.card },
  contentInfo: { flex: 1 },
  typeRow: { marginBottom: 3 },
  typeTag: { fontFamily: 'Inter-Medium', fontSize: 9, color: colors.brand.primary, letterSpacing: 0.5 },
  contentTitle: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.text.primary, lineHeight: 18, marginBottom: 2 },
  contentScholar: { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.text.secondary },
  heartBtn: { padding: 8 },
  progressCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.background.card, borderWidth: 2, borderColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  progressPct: { fontFamily: 'Inter-Bold', fontSize: 13, color: colors.brand.primary },
  progressBar: { height: 2, backgroundColor: colors.border.default, borderRadius: 1, marginTop: 6 },
  progressFill: { height: 2, backgroundColor: colors.brand.primary, borderRadius: 1 },
  sectionSubtitle: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.text.secondary, marginBottom: spacing.lg, lineHeight: 18 },
  bookCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.md },
  bookEmoji: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.background.elevated, alignItems: 'center', justifyContent: 'center' },
  bookInfo: { flex: 1 },
  bookTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.text.primary, marginBottom: 3 },
  bookAuthor: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.text.secondary, marginBottom: 6 },
  bookTag: { alignSelf: 'flex-start', backgroundColor: 'rgba(4, 209, 130, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  bookTagText: { fontFamily: 'Inter-Medium', fontSize: 9, color: colors.brand.primary, letterSpacing: 0.5 },
});
