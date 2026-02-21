import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth, apiRequest } from '../../context/AuthContext';
import { colors, spacing, radius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { formatDuration } from '../../constants/mockData';

interface Course {
  id: string;
  title: string;
  scholar_name: string;
  thumbnail: string;
  thematique_id: string;
  modules_count: number;
}

interface Bibliography {
  id: string;
  title: string;
  thematique_id: string;
  content_fr: string;
  content_en: string;
}

interface Conference {
  id: string;
  title: string;
  speaker_name: string;
  duration: number;
  thumbnail: string;
  thematique_id: string;
}

interface AudioCategory {
  id: string;
  name: string;
  r2_folder: string;
  is_active: boolean;
}

interface Audio {
  id: string;
  title: string;
  scholar_name: string;
  duration: number;
  file_key: string;
  category_id: string;
  module_id: string;
}

type TabType = 'cursus' | 'favoris' | 'biblio' | 'conferences' | 'autres';

export default function RessourcesScreen() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('cursus');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [userCourses, setUserCourses] = useState<Course[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [bibliographies, setBibliographies] = useState<Bibliography[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [thematiques, setThematiques] = useState<any[]>([]);
  const [userAccess, setUserAccess] = useState<any>(null);
  const [selectedBiblio, setSelectedBiblio] = useState<Bibliography | null>(null);
  const [audioCategories, setAudioCategories] = useState<AudioCategory[]>([]);
  const [audios, setAudios] = useState<Audio[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      // Get user access info to filter by subscribed thematiques
      const accessResp = await apiRequest('/user/access', token);
      if (accessResp.ok) {
        const accessData = await accessResp.json();
        setUserAccess(accessData);
      }

      // Load all data in parallel
      const [themRes, coursesRes, biblioRes, confRes, favRes, audioCatRes, audiosRes] = await Promise.all([
        apiRequest('/thematiques', token),
        apiRequest('/courses', token),
        apiRequest('/bibliographies', token),
        apiRequest('/conferences', token),
        apiRequest('/user/favorites', token).catch(() => ({ ok: false })),
        apiRequest('/audio-categories', token).catch(() => ({ ok: false })),
        apiRequest('/audios', token).catch(() => ({ ok: false })),
      ]);

      if (themRes.ok) {
        const data = await themRes.json();
        setThematiques(data);
      }

      if (coursesRes.ok) {
        const data = await coursesRes.json();
        // Filter to show courses the user has started (in progress)
        setUserCourses(data.filter((c: Course) => c.is_active !== false).slice(0, 10));
      }

      if (biblioRes.ok) {
        const data = await biblioRes.json();
        setBibliographies(data);
      }

      if (confRes.ok) {
        const data = await confRes.json();
        setConferences(data);
      }

      if (favRes.ok) {
        const data = await favRes.json();
        setFavorites(data);
      }

      if (audioCatRes.ok) {
        const data = await audioCatRes.json();
        setAudioCategories(data);
      }

      if (audiosRes.ok) {
        const data = await audiosRes.json();
        setAudios(data);
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

  const getThematiqueName = (id: string) => {
    const t = thematiques.find(t => t.id === id);
    return t?.name || '';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
          <Text style={styles.loadingText}>Chargement des ressources...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Bibliography detail view
  if (selectedBiblio) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.detailHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => setSelectedBiblio(null)}>
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
                <Text style={styles.sectionTitleDetail}>Ouvrages en français</Text>
              </View>
              <Text style={styles.articleText}>{selectedBiblio.content_fr}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.articleSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="globe" size={20} color={colors.brand.primary} />
                <Text style={styles.sectionTitleDetail}>Essential readings (English)</Text>
              </View>
              <Text style={styles.articleText}>{selectedBiblio.content_en}</Text>
            </View>
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const TABS = [
    { key: 'cursus', label: 'Mes cursus', icon: 'school-outline' },
    { key: 'favoris', label: 'Favoris', icon: 'heart-outline' },
    { key: 'biblio', label: 'Bibliographie', icon: 'book-outline' },
    { key: 'conferences', label: 'Conférences', icon: 'mic-outline' },
    { key: 'autres', label: 'Autres', icon: 'musical-notes-outline' },
  ] as const;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.brand.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ressources</Text>
          <Text style={styles.headerSubtitle}>
            Vos cursus, favoris et ressources complémentaires
          </Text>
        </View>

        {/* Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.tabsContainer}
          contentContainerStyle={styles.tabsContent}
        >
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key as TabType)}
            >
              <Ionicons 
                name={tab.icon as any} 
                size={18} 
                color={activeTab === tab.key ? '#000' : colors.text.secondary} 
              />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tab Content */}
        <View style={styles.content}>
          {activeTab === 'cursus' && (
            <View>
              {userCourses.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="school-outline" size={48} color={colors.text.tertiary} />
                  <Text style={styles.emptyTitle}>Aucun cursus en cours</Text>
                  <Text style={styles.emptySubtitle}>Commencez un cours pour le voir ici</Text>
                  <TouchableOpacity 
                    style={styles.emptyButton}
                    onPress={() => router.push('/(tabs)/cursus')}
                  >
                    <Text style={styles.emptyButtonText}>Explorer les cursus</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                userCourses.map(course => (
                  <TouchableOpacity
                    key={course.id}
                    style={styles.courseCard}
                    onPress={() => router.push(`/course/${course.id}` as any)}
                  >
                    <Image 
                      source={{ uri: course.thumbnail || 'https://via.placeholder.com/80' }} 
                      style={styles.courseThumb} 
                    />
                    <View style={styles.courseInfo}>
                      <Text style={styles.courseTopic}>{getThematiqueName(course.thematique_id)}</Text>
                      <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
                      <Text style={styles.courseMeta}>{course.scholar_name} · {course.modules_count} modules</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {activeTab === 'favoris' && (
            <View>
              {favorites.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="heart-outline" size={48} color={colors.text.tertiary} />
                  <Text style={styles.emptyTitle}>Aucun favori</Text>
                  <Text style={styles.emptySubtitle}>Ajoutez des cours à vos favoris pour y accéder rapidement</Text>
                </View>
              ) : (
                favorites.map((fav: any) => (
                  <TouchableOpacity
                    key={fav.content_id}
                    style={styles.courseCard}
                    onPress={() => router.push(`/course/${fav.content_id}` as any)}
                  >
                    <View style={styles.favIcon}>
                      <Ionicons name="heart" size={20} color={colors.brand.primary} />
                    </View>
                    <View style={styles.courseInfo}>
                      <Text style={styles.courseTitle}>{fav.content_title || fav.content_id}</Text>
                      <Text style={styles.courseMeta}>{fav.content_type}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {activeTab === 'biblio' && (
            <View>
              {bibliographies.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="book-outline" size={48} color={colors.text.tertiary} />
                  <Text style={styles.emptyTitle}>Aucune bibliographie</Text>
                  <Text style={styles.emptySubtitle}>Les bibliographies seront disponibles prochainement</Text>
                </View>
              ) : (
                bibliographies.map((biblio, index) => (
                  <TouchableOpacity
                    key={biblio.id}
                    style={styles.biblioCard}
                    onPress={() => setSelectedBiblio(biblio)}
                  >
                    <View style={styles.biblioNumber}>
                      <Text style={styles.biblioNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.courseInfo}>
                      <Text style={styles.biblioTitle}>{biblio.title.replace('Bibliographie : ', '')}</Text>
                      <Text style={styles.biblioHint}>Voir les ouvrages recommandés</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {activeTab === 'conferences' && (
            <View>
              {conferences.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="mic-outline" size={48} color={colors.text.tertiary} />
                  <Text style={styles.emptyTitle}>Aucune conférence</Text>
                  <Text style={styles.emptySubtitle}>Les conférences et interventions externes seront ajoutées prochainement</Text>
                </View>
              ) : (
                conferences.map(conf => (
                  <TouchableOpacity
                    key={conf.id}
                    style={styles.confCard}
                    onPress={() => {/* TODO: Open conference detail */}}
                  >
                    <Image 
                      source={{ uri: conf.thumbnail || 'https://via.placeholder.com/80' }} 
                      style={styles.confThumb} 
                    />
                    <View style={styles.courseInfo}>
                      <Text style={styles.confTitle} numberOfLines={2}>{conf.title}</Text>
                      <Text style={styles.confSpeaker}>{conf.speaker_name}</Text>
                      <View style={styles.confMeta}>
                        <Ionicons name="time-outline" size={12} color={colors.text.tertiary} />
                        <Text style={styles.confDuration}>{formatDuration(conf.duration)}</Text>
                      </View>
                    </View>
                    <View style={styles.playButton}>
                      <Ionicons name="play" size={16} color="#000" />
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {activeTab === 'autres' && (
            <View>
              {/* Audio Categories */}
              <Text style={styles.sectionLabel}>Catégories Audio</Text>
              {audioCategories.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="musical-notes-outline" size={48} color={colors.text.tertiary} />
                  <Text style={styles.emptyTitle}>Aucune catégorie</Text>
                  <Text style={styles.emptySubtitle}>Les récitations du Coran, musique et autres audios seront ajoutés prochainement</Text>
                </View>
              ) : (
                <>
                  {/* Category Pills */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPills}>
                    {audioCategories.map(cat => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.categoryPill, selectedCategory === cat.id && styles.categoryPillActive]}
                        onPress={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                      >
                        <Ionicons 
                          name={cat.name.toLowerCase().includes('coran') ? 'book' : cat.name.toLowerCase().includes('musique') ? 'musical-notes' : 'headset'} 
                          size={16} 
                          color={selectedCategory === cat.id ? '#000' : colors.text.secondary} 
                        />
                        <Text style={[styles.categoryPillText, selectedCategory === cat.id && styles.categoryPillTextActive]}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Audios list */}
                  {audios
                    .filter(a => !selectedCategory || a.category_id === selectedCategory)
                    .map(audio => (
                      <TouchableOpacity
                        key={audio.id}
                        style={styles.audioCard}
                        onPress={() => {/* TODO: Play audio */}}
                      >
                        <View style={styles.audioIcon}>
                          <Ionicons name="musical-note" size={20} color={colors.brand.primary} />
                        </View>
                        <View style={styles.courseInfo}>
                          <Text style={styles.audioTitle} numberOfLines={2}>{audio.title}</Text>
                          <Text style={styles.audioMeta}>
                            {audio.scholar_name || 'Inconnu'} · {formatDuration(audio.duration)}
                          </Text>
                        </View>
                        <View style={styles.playButton}>
                          <Ionicons name="play" size={16} color="#000" />
                        </View>
                      </TouchableOpacity>
                    ))}

                  {audios.filter(a => !selectedCategory || a.category_id === selectedCategory).length === 0 && (
                    <View style={styles.emptyState}>
                      <Ionicons name="musical-notes-outline" size={32} color={colors.text.tertiary} />
                      <Text style={styles.emptySubtitle}>Aucun audio dans cette catégorie</Text>
                    </View>
                  )}
                </>
              )}
            </View>
          )}
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

  // Tabs
  tabsContainer: {
    marginBottom: spacing.lg,
  },
  tabsContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  tabActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  tabText: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: colors.text.secondary,
  },
  tabTextActive: {
    color: '#000',
  },

  content: {
    paddingHorizontal: spacing.lg,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.md,
  },
  emptyTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: colors.text.primary,
  },
  emptySubtitle: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.brand.primary,
    borderRadius: radius.full,
  },
  emptyButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#000',
  },

  // Course Card
  courseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  courseThumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.background.elevated,
  },
  courseInfo: {
    flex: 1,
  },
  courseTopic: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    color: colors.brand.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  courseTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: 4,
    lineHeight: 19,
  },
  courseMeta: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: colors.text.secondary,
  },

  // Favorite
  favIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(217, 255, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bibliography
  biblioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  biblioNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(217, 255, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  biblioNumberText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: colors.brand.primary,
  },
  biblioTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: 2,
  },
  biblioHint: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: colors.text.secondary,
  },

  // Conference
  confCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  confThumb: {
    width: 70,
    height: 70,
    borderRadius: radius.md,
    backgroundColor: colors.background.elevated,
  },
  confTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: 4,
    lineHeight: 19,
  },
  confSpeaker: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: colors.brand.primary,
    marginBottom: 6,
  },
  confMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confDuration: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: colors.text.tertiary,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Detail view
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
  sectionTitleDetail: {
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
