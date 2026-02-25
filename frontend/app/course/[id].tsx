import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Dimensions, Platform,
  StatusBar, Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { apiRequest, useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useAccessCheck } from '../../hooks/useAccessCheck';

const { width: SW } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 24;

const CURSUS_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const CURSUS_COLORS: Record<string, string> = {
  A: '#04D182',
  B: '#8B5CF6',
  C: '#F59E0B',
  D: '#EC4899',
  E: '#06B6D4',
  F: '#C9A84C',
};

type EpisodeStatus = 'todo' | 'active' | 'done';
type TabKey = 'episodes' | 'professeurs' | 'ressources';

interface Episode {
  id: string;
  number: number;
  title: string;
  duration: number;
  status: EpisodeStatus;
}

interface Bibliography {
  id: string;
  title: string;
  content: string;
  module_number: number;
  course_id?: string;
}

interface Scholar {
  id: string;
  name: string;
  title?: string;
  photo?: string;
}

function fmtDur(s: number): string {
  if (!s) return '';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m > 0 ? m + 'min' : ''}`.trim();
  return `${m} min`;
}

function fmtDurShort(s: number): string {
  if (!s) return '';
  const m = Math.floor(s / 60);
  return `${m} min`;
}

// Episode Play Button Component
function EpisodePlayBtn({ status, color, size = 28, isLocked = false }: { status: EpisodeStatus; color: string; size?: number; isLocked?: boolean }) {
  if (isLocked) {
    return (
      <View style={[styles.epPlayBtn, { width: size, height: size, backgroundColor: '#222222' }]}>
        <Ionicons name="lock-closed" size={10} color="#555555" />
      </View>
    );
  }
  if (status === 'todo') {
    return (
      <View style={[styles.epPlayBtn, { width: size, height: size, backgroundColor: '#222222' }]}>
        <Ionicons name="play" size={10} color="#777777" style={{ marginLeft: 1 }} />
      </View>
    );
  }
  if (status === 'active') {
    return (
      <View style={[styles.epPlayBtn, { width: size, height: size, backgroundColor: color }]}>
        <Ionicons name="pause" size={10} color="#0A0A0A" />
      </View>
    );
  }
  return (
    <View style={[
      styles.epPlayBtn,
      { width: size, height: size, backgroundColor: `${color}1F`, borderWidth: 1, borderColor: `${color}4D` },
    ]}>
      <Ionicons name="checkmark" size={12} color={color} />
    </View>
  );
}

// Progress Bar Component
function ProgressBar({ progress, color, height = 2 }: { progress: number; color: string; height?: number }) {
  return (
    <View style={[styles.progressTrack, { height }]}>
      <View style={[styles.progressFill, { width: `${Math.min(100, progress)}%`, backgroundColor: color }]} />
    </View>
  );
}

// Main Component
export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token, user } = useAuth();

  const [course, setCourse] = useState<any>(null);
  const [cursus, setCursus] = useState<any>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [scholars, setScholars] = useState<Scholar[]>([]);
  const [bibliographies, setBibliographies] = useState<Bibliography[]>([]);
  const [userProgress, setUserProgress] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('episodes');

  const { hasAccess, loading: accessLoading } = useAccessCheck('course', id);

  // Derive cursus letter and color
  const cursusOrder = cursus?.order || 1;
  const cursusLetter = CURSUS_LETTERS[Math.max(0, Math.min(cursusOrder - 1, CURSUS_LETTERS.length - 1))];
  const cursusColor = CURSUS_COLORS[cursusLetter] || '#04D182';

  // Load Data
  const loadData = useCallback(async () => {
    try {
      const [courseRes, playlistRes, progressRes, allCursusRes, scholarsRes, biblioRes] = await Promise.all([
        apiRequest(`/courses/${id}`, token),
        apiRequest(`/courses/${id}/playlist`, token),
        token ? apiRequest('/user/progress', token) : Promise.resolve({ ok: false }),
        apiRequest('/cursus', token),
        apiRequest('/scholars', token),
        apiRequest(`/bibliographies?course_id=${id}`, token),
      ]);

      let courseData = null;
      if (courseRes.ok) {
        courseData = await courseRes.json();
        setCourse(courseData);

        // Find the cursus for this course
        if (allCursusRes.ok) {
          const allCursus = await allCursusRes.json();
          const foundCursus = allCursus.find((c: any) => 
            c.id === courseData.cursus_id || c.id === courseData.thematique_id
          );
          setCursus(foundCursus);
        }
      }

      // Get scholars for this course
      if (scholarsRes.ok && courseData) {
        const allScholars = await scholarsRes.json();
        // Filter scholars that teach this course (by scholar_id on the course)
        const courseScholars = allScholars.filter((s: any) => 
          s.id === courseData.scholar_id
        );
        setScholars(courseScholars);
      }

      // Get bibliographies for this course
      if (biblioRes.ok) {
        const biblioData = await biblioRes.json();
        const filteredBiblios = (biblioData || []).filter((b: any) => 
          b.content && (b.course_id === id)
        );
        setBibliographies(filteredBiblios);
      }

      // Build progress map
      const progressMap: Record<string, any> = {};
      if (progressRes.ok) {
        const progressData = await progressRes.json();
        (progressData || []).forEach((p: any) => {
          progressMap[p.content_id] = p;
        });
      }
      setUserProgress(progressMap);

      // Process playlist into episodes
      if (playlistRes.ok) {
        const playlist = await playlistRes.json();
        const eps: Episode[] = playlist.map((ep: any, idx: number) => {
          const epProgress = progressMap[ep.audio_id];
          let epStatus: EpisodeStatus = 'todo';
          
          if (epProgress) {
            if (epProgress.completed || epProgress.progress >= 0.9) {
              epStatus = 'done';
            } else if (epProgress.progress > 0) {
              epStatus = 'active';
            }
          }
          
          return {
            id: ep.audio_id,
            number: idx + 1,
            title: ep.module_name || ep.audio_title || `Épisode ${idx + 1}`,
            duration: ep.duration || 0,
            status: epStatus,
          };
        });
        setEpisodes(eps);
      }
    } catch (e) {
      console.error('Load course detail error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, token]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = () => { setRefreshing(true); loadData(); };

  // Handlers
  const handleFavorite = async () => {
    if (!token) return;
    if (isFavorite) {
      await apiRequest(`/user/favorites/course/${id}`, token, { method: 'DELETE' });
      setIsFavorite(false);
    } else {
      await apiRequest('/user/favorites', token, {
        method: 'POST',
        body: JSON.stringify({ content_id: id, content_type: 'course' }),
      });
      setIsFavorite(true);
    }
  };

  const goToEpisode = (episodeId: string, autoplay: boolean = true) => {
    router.push(`/audio/${episodeId}?course_id=${id}&autoplay=${autoplay ? '1' : '0'}` as any);
  };

  const handleStart = () => {
    const currentEp = episodes.find(e => e.status === 'active') || 
                      episodes.find(e => e.status === 'todo') || 
                      episodes[0];
    if (currentEp) {
      goToEpisode(currentEp.id, true);
    }
  };

  // Computed Stats
  const completedEpisodes = episodes.filter(e => e.status === 'done').length;
  const totalDuration = episodes.reduce((sum, e) => sum + e.duration, 0);
  const courseProgress = episodes.length > 0 ? Math.round((completedEpisodes / episodes.length) * 100) : 0;
  const remainingDuration = totalDuration * (1 - courseProgress / 100);

  // Scholar initials
  const scholarInitials = course?.scholar_name
    ? course.scholar_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : '';

  // Loading State
  if (loading || accessLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#04D182" />
      </View>
    );
  }

  if (!course) return null;

  // Tabs configuration
  const TABS: { key: TabKey; label: string }[] = [
    { key: 'episodes', label: 'Épisodes' },
    { key: 'professeurs', label: 'Professeurs' },
    { key: 'ressources', label: 'Ressources' },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={cursusColor} />
        }
      >
        {/* HERO COURSE */}
        <View style={styles.hero}>
          <View style={[styles.heroGlow, { backgroundColor: `${cursusColor}12` }]} pointerEvents="none" />
          <View style={[styles.heroLeftBorder, { backgroundColor: cursusColor }]} />

          {/* Navigation */}
          <View style={[styles.heroNav, { paddingTop: STATUS_BAR_HEIGHT + 10 }]}>
            <TouchableOpacity
              testID="course-back-btn"
              style={styles.backBtn}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={18} color="rgba(245,240,232,0.6)" />
              <Text style={styles.backLabel}>Cours</Text>
            </TouchableOpacity>
            <View style={styles.heroNavRight}>
              <TouchableOpacity style={styles.navIconBtn} onPress={handleFavorite}>
                <Ionicons 
                  name={isFavorite ? 'bookmark' : 'bookmark-outline'} 
                  size={18} 
                  color={isFavorite ? '#C9A84C' : 'rgba(245,240,232,0.6)'} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Eyebrow */}
          <View style={styles.heroEyebrow}>
            <View style={[styles.heroEyebrowLine, { backgroundColor: cursusColor }]} />
            <Text style={[styles.heroEyebrowText, { color: cursusColor }]}>
              Cursus {cursusLetter} · {cursus?.name?.split('.')[1]?.trim() || 'Cours'}
            </Text>
          </View>

          {/* Title */}
          <Text style={styles.heroTitle} testID="course-title">
            {course.title}
          </Text>

          {/* Scholar */}
          {course.scholar_name && (
            <TouchableOpacity 
              style={styles.scholarRow}
              onPress={() => router.push(`/scholar/${course.scholar_id}` as any)}
            >
              <View style={[styles.scholarAvatar, { backgroundColor: `${cursusColor}1A` }]}>
                <Text style={[styles.scholarInitials, { color: cursusColor }]}>{scholarInitials}</Text>
              </View>
              <Text style={styles.scholarName}>{course.scholar_name}</Text>
            </TouchableOpacity>
          )}

          {/* Description */}
          {course.description && (
            <Text style={styles.heroDesc} numberOfLines={3}>{course.description}</Text>
          )}

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{episodes.length}</Text>
              <Text style={styles.statLabel}>Épisodes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{fmtDur(totalDuration)}</Text>
              <Text style={styles.statLabel}>Durée</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={[styles.statValue, { color: cursusColor }]}>{courseProgress}%</Text>
              <Text style={styles.statLabel}>Complété</Text>
            </View>
          </View>

          {/* Course Progress Bar */}
          {courseProgress > 0 && (
            <View style={styles.courseProgressWrap}>
              <ProgressBar progress={courseProgress} color={cursusColor} height={2} />
              <Text style={[styles.courseProgressText, { color: cursusColor }]}>
                {courseProgress}% complété · {fmtDur(remainingDuration)} restantes
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.heroBtns}>
            <TouchableOpacity
              testID="course-start-btn"
              style={[styles.btnPrimary, { backgroundColor: cursusColor }]}
              onPress={handleStart}
            >
              <Ionicons name="play" size={14} color="#0A0A0A" />
              <Text style={styles.btnPrimaryText}>
                {courseProgress > 0 ? 'Continuer' : 'Commencer'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.btnSecondary}
              onPress={handleFavorite}
            >
              <Ionicons name={isFavorite ? 'bookmark' : 'bookmark-outline'} size={14} color="#C9A84C" />
              <Text style={styles.btnSecondaryText}>
                {isFavorite ? 'Sauvegardé' : 'Sauvegarder'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* TABS */}
        <View style={styles.tabsContainer}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              testID={`course-tab-${tab.key}`}
              style={[
                styles.tabBtn,
                activeTab === tab.key && [styles.tabBtnActive, { borderBottomColor: cursusColor }],
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === tab.key && [styles.tabLabelActive, { color: cursusColor }],
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* TAB CONTENT: Episodes */}
        {activeTab === 'episodes' && (
          <View style={styles.episodesContainer}>
            {!hasAccess && (
              <View style={styles.accessWarning}>
                <Ionicons name="lock-closed" size={14} color={cursusColor} />
                <Text style={[styles.accessWarningText, { color: cursusColor }]}>
                  Abonnez-vous pour accéder à l'intégralité du cours
                </Text>
              </View>
            )}

            {episodes.map((ep, idx) => {
              const isLocked = !hasAccess && idx > 0;
              const isPreview = !hasAccess && idx === 0;
              
              return (
                <TouchableOpacity
                  key={ep.id}
                  testID={`course-episode-${ep.id}`}
                  style={[
                    styles.episodeRow,
                    ep.status === 'active' && styles.episodeRowActive,
                  ]}
                  onPress={() => !isLocked && goToEpisode(ep.id)}
                  disabled={isLocked}
                  activeOpacity={isLocked ? 1 : 0.7}
                >
                  <Text style={[
                    styles.episodeNum,
                    { color: ep.status === 'active' ? cursusColor : isLocked ? '#333' : '#444444' },
                  ]}>
                    {String(ep.number).padStart(2, '0')}
                  </Text>
                  <View style={styles.episodeInfo}>
                    <Text style={[
                      styles.episodeTitle,
                      { color: isLocked ? 'rgba(245,240,232,0.35)' : ep.status === 'active' ? '#F5F0E8' : 'rgba(245,240,232,0.75)' },
                    ]} numberOfLines={2}>
                      {ep.title}
                    </Text>
                    <View style={styles.episodeMeta}>
                      <Text style={[
                        styles.episodeDuration,
                        { color: ep.status === 'active' ? cursusColor : '#777777' },
                      ]}>
                        {fmtDurShort(ep.duration)}
                      </Text>
                      {isPreview && (
                        <View style={[styles.freeBadge, { backgroundColor: `${cursusColor}1A` }]}>
                          <Text style={[styles.freeBadgeText, { color: cursusColor }]}>Aperçu gratuit</Text>
                        </View>
                      )}
                      {ep.status === 'active' && (
                        <View style={[styles.activeBadge, { backgroundColor: `${cursusColor}1A` }]}>
                          <Text style={[styles.activeBadgeText, { color: cursusColor }]}>En cours</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <EpisodePlayBtn status={ep.status} color={cursusColor} size={28} isLocked={isLocked} />
                </TouchableOpacity>
              );
            })}

            {episodes.length === 0 && (
              <Text style={styles.emptyText}>Aucun épisode disponible pour ce cours.</Text>
            )}
          </View>
        )}

        {/* TAB CONTENT: Professeurs */}
        {activeTab === 'professeurs' && (
          <View style={styles.scholarsTab}>
            {scholars.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="school-outline" size={40} color="#333" />
                <Text style={styles.emptyTitle}>Aucun professeur</Text>
                <Text style={styles.emptyText}>Les professeurs de ce cours apparaîtront ici.</Text>
              </View>
            ) : (
              scholars.map((scholar, idx) => (
                <TouchableOpacity
                  key={scholar.id}
                  testID={`course-scholar-${scholar.id}`}
                  style={[styles.scholarCard, idx !== scholars.length - 1 && styles.scholarCardBorder]}
                  onPress={() => router.push(`/scholar/${scholar.id}` as any)}
                  activeOpacity={0.85}
                >
                  {scholar.photo ? (
                    <View style={styles.scholarPhoto}>
                      <Image
                        source={{ uri: scholar.photo }}
                        style={[styles.scholarPhotoImg, { borderColor: cursusColor }]}
                        resizeMode="cover"
                      />
                    </View>
                  ) : (
                    <View style={styles.scholarPhoto}>
                      <View style={[styles.scholarPhotoInner, { borderColor: cursusColor }]}>
                        <Text style={styles.scholarInitial}>{scholar.name.charAt(0)}</Text>
                      </View>
                    </View>
                  )}
                  <View style={styles.scholarInfo}>
                    <Text style={styles.scholarCardName}>{scholar.name}</Text>
                    {scholar.title && (
                      <Text style={styles.scholarTitle}>{scholar.title}</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#777" />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* TAB CONTENT: Ressources */}
        {activeTab === 'ressources' && (
          <View style={styles.resourcesTab}>
            {bibliographies.length > 0 ? (
              <View>
                <Text style={styles.sectionSubtitle}>Bibliographie</Text>
                {bibliographies.map((biblio) => (
                  <TouchableOpacity
                    key={biblio.id}
                    testID={`course-biblio-${biblio.id}`}
                    style={styles.biblioCard}
                    onPress={() => router.push(`/bibliography/${biblio.id}` as any)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.biblioHeader}>
                      <View style={[styles.biblioIcon, { backgroundColor: `${cursusColor}1A` }]}>
                        <Ionicons name="book-outline" size={18} color={cursusColor} />
                      </View>
                      <View style={styles.biblioTitleContainer}>
                        <Text style={styles.biblioTitle}>{biblio.title}</Text>
                        <Text style={styles.biblioSubtitle}>Appuyez pour lire</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#888" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="library-outline" size={40} color="#333" />
                <Text style={styles.emptyTitle}>Ressources à venir</Text>
                <Text style={styles.emptyText}>
                  La bibliographie pour ce cours sera disponible prochainement.
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  loadingWrap: { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' },

  // HERO
  hero: {
    paddingBottom: 24,
    position: 'relative',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      background: 'linear-gradient(160deg, #0D1F17 0%, #090F0C 60%, #0A0A0A 100%)',
    } as any : { backgroundColor: '#0D1F17' }),
  },
  heroGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.7,
  },
  heroLeftBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    ...(Platform.OS === 'web' ? {
      background: 'linear-gradient(180deg, #04D182 0%, transparent 100%)',
    } as any : {}),
  },
  heroNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backLabel: {
    fontFamily: 'Cinzel',
    fontSize: 8,
    letterSpacing: 3,
    color: 'rgba(245,240,232,0.5)',
    textTransform: 'uppercase',
  },
  heroNavRight: {
    flexDirection: 'row',
    gap: 10,
  },
  navIconBtn: {
    padding: 4,
  },
  heroEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  heroEyebrowLine: {
    width: 18,
    height: 1,
  },
  heroEyebrowText: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily: 'Cinzel',
    fontSize: 18,
    fontWeight: '400',
    color: '#F5F0E8',
    letterSpacing: 0.5,
    lineHeight: 26,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  scholarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  scholarAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scholarInitials: {
    fontFamily: 'Cinzel',
    fontSize: 8,
    fontWeight: '600',
  },
  scholarName: {
    fontFamily: 'EBGaramond',
    fontSize: 13,
    fontStyle: 'italic',
    color: '#C9A84C',
  },
  heroDesc: {
    fontFamily: 'EBGaramond',
    fontSize: 14,
    color: 'rgba(245,240,232,0.50)',
    lineHeight: 22,
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
    gap: 0,
  },
  statBlock: {
    flex: 1,
    gap: 3,
  },
  statValue: {
    fontFamily: 'Cinzel',
    fontSize: 16,
    fontWeight: '600',
    color: '#F5F0E8',
  },
  statLabel: {
    fontFamily: 'Cinzel',
    fontSize: 6,
    letterSpacing: 3,
    color: '#777777',
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#222222',
    marginHorizontal: 12,
  },
  courseProgressWrap: {
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  progressTrack: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  courseProgressText: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  heroBtns: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
  },
  btnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  btnPrimaryText: {
    fontFamily: 'Cinzel',
    fontSize: 9,
    letterSpacing: 3,
    color: '#0A0A0A',
    textTransform: 'uppercase',
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  btnSecondaryText: {
    fontFamily: 'Cinzel',
    fontSize: 8,
    letterSpacing: 2,
    color: '#C9A84C',
    textTransform: 'uppercase',
  },

  // TABS
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
    marginTop: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomWidth: 2,
  },
  tabLabel: {
    fontFamily: 'Cinzel',
    fontSize: 8,
    letterSpacing: 3,
    color: '#666666',
    textTransform: 'uppercase',
  },
  tabLabelActive: {
    fontWeight: '600',
  },

  // EPISODES CONTAINER
  episodesContainer: {
    paddingTop: 18,
  },
  sectionLabel: {
    fontFamily: 'Cinzel',
    fontSize: 8,
    letterSpacing: 4,
    color: '#777777',
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  accessWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 12,
    backgroundColor: 'rgba(4,209,130,0.08)',
  },
  accessWarningText: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    letterSpacing: 2,
    textTransform: 'uppercase',
    flex: 1,
  },
  emptyText: {
    fontFamily: 'EBGaramond',
    fontSize: 14,
    color: '#777777',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 40,
  },

  // EPISODE ROW
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#111111',
    marginBottom: 2,
  },
  episodeRowActive: {
    backgroundColor: '#1A1A1A',
    borderLeftWidth: 3,
    borderLeftColor: '#04D182',
    paddingLeft: 17,
  },
  episodeNum: {
    fontFamily: 'Cinzel',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    width: 26,
    textAlign: 'center',
    flexShrink: 0,
  },
  episodeInfo: {
    flex: 1,
    minWidth: 0,
  },
  episodeTitle: {
    fontFamily: 'EBGaramond',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  episodeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  episodeDuration: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    letterSpacing: 1,
    textTransform: 'uppercase',
    flexShrink: 0,
  },
  freeBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  freeBadgeText: {
    fontFamily: 'Cinzel',
    fontSize: 6,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  activeBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  activeBadgeText: {
    fontFamily: 'Cinzel',
    fontSize: 6,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  epPlayBtn: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // SCHOLARS TAB
  scholarsTab: {
    paddingTop: 18,
  },
  scholarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#111111',
  },
  scholarCardBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  scholarPhoto: {
    width: 56,
    height: 56,
  },
  scholarPhotoImg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
  },
  scholarPhotoInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scholarInitial: {
    fontFamily: 'Cinzel',
    fontSize: 20,
    color: '#777',
  },
  scholarInfo: {
    flex: 1,
  },
  scholarCardName: {
    fontFamily: 'Cinzel',
    fontSize: 13,
    color: '#F5F0E8',
    marginBottom: 4,
  },
  scholarTitle: {
    fontFamily: 'EBGaramond',
    fontSize: 12,
    fontStyle: 'italic',
    color: '#777777',
  },

  // RESOURCES TAB
  resourcesTab: {
    paddingTop: 18,
    paddingHorizontal: 20,
  },
  sectionSubtitle: {
    fontFamily: 'Cinzel',
    fontSize: 8,
    letterSpacing: 4,
    color: '#C9A84C',
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  biblioCard: {
    backgroundColor: '#111111',
    marginBottom: 10,
    padding: 16,
  },
  biblioCardExpanded: {
    backgroundColor: '#151515',
  },
  biblioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  biblioIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  biblioTitleContainer: {
    flex: 1,
  },
  biblioTitle: {
    fontFamily: 'Cinzel',
    fontSize: 11,
    color: '#F5F0E8',
    letterSpacing: 0.5,
  },
  biblioSubtitle: {
    fontFamily: 'EBGaramond',
    fontSize: 11,
    fontStyle: 'italic',
    color: '#777777',
    marginTop: 4,
  },

  // EMPTY STATE
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontFamily: 'Cinzel',
    fontSize: 12,
    color: '#555',
    marginTop: 16,
    marginBottom: 8,
  },
});
