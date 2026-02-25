import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Dimensions, Platform,
  StatusBar, Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth, apiRequest } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

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

type CourseStatus = 'todo' | 'active' | 'done';
type EpisodeStatus = 'todo' | 'active' | 'done';
type TabKey = 'cours' | 'professeurs' | 'ressources';

interface Episode {
  id: string;
  number: number;
  title: string;
  duration: number;
  status: EpisodeStatus;
}

interface Course {
  id: string;
  title: string;
  description?: string;
  scholar_name?: string;
  modules_count: number;
  duration: number;
  status: CourseStatus;
  progress?: number;
  current_episode?: number;
  episodes?: Episode[];
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

// ─── Status Icon Component ────────────────────────────────────────────────────
function StatusIcon({ status, color, size = 28 }: { status: CourseStatus; color: string; size?: number }) {
  if (status === 'todo') {
    return (
      <View style={[styles.statusCircle, { width: size, height: size, backgroundColor: '#222222' }]}>
        <View style={[styles.statusCircleInner, { borderColor: '#777777' }]} />
      </View>
    );
  }
  if (status === 'active') {
    return (
      <View style={[
        styles.statusCircle,
        { width: size, height: size, backgroundColor: color },
        Platform.OS === 'web' ? { boxShadow: `0 0 10px ${color}40` } as any : {},
      ]}>
        <Ionicons name="play" size={12} color="#0A0A0A" style={{ marginLeft: 1 }} />
      </View>
    );
  }
  // done
  return (
    <View style={[
      styles.statusCircle,
      { width: size, height: size, backgroundColor: `${color}1F`, borderWidth: 1, borderColor: `${color}4D` },
    ]}>
      <Ionicons name="checkmark" size={14} color={color} strokeWidth={2.5} />
    </View>
  );
}

// ─── Episode Play Button Component ────────────────────────────────────────────
function EpisodePlayBtn({ status, color, size = 28 }: { status: EpisodeStatus; color: string; size?: number }) {
  if (status === 'todo') {
    return (
      <View style={[styles.epPlayBtn, { width: size, height: size, backgroundColor: '#222222' }]}>
        <Ionicons name="play" size={10} color="#777777" style={{ marginLeft: 1 }} />
      </View>
    );
  }
  if (status === 'active') {
    return (
      <View style={[
        styles.epPlayBtn,
        { width: size, height: size, backgroundColor: color },
      ]}>
        <Ionicons name="pause" size={10} color="#0A0A0A" />
      </View>
    );
  }
  // done
  return (
    <View style={[
      styles.epPlayBtn,
      { width: size, height: size, backgroundColor: `${color}1F`, borderWidth: 1, borderColor: `${color}4D` },
    ]}>
      <Ionicons name="checkmark" size={12} color={color} />
    </View>
  );
}

// ─── Progress Bar Component ───────────────────────────────────────────────────
function ProgressBar({ progress, color, height = 2 }: { progress: number; color: string; height?: number }) {
  return (
    <View style={[styles.progressTrack, { height }]}>
      <View style={[styles.progressFill, { width: `${Math.min(100, progress)}%`, backgroundColor: color }]} />
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CursusCoursesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token, user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const [cursus, setCursus] = useState<any>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [scholars, setScholars] = useState<any[]>([]);
  const [userProgress, setUserProgress] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('cours');
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);

  // Derive cursus letter and color
  const cursusLetter = cursus
    ? CURSUS_LETTERS[Math.max(0, Math.min((cursus.order || 1) - 1, CURSUS_LETTERS.length - 1))]
    : 'A';
  const cursusColor = CURSUS_COLORS[cursusLetter] || '#04D182';

  // ─── Load Data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [cursusRes, coursesRes, progressRes, scholarsRes] = await Promise.all([
        apiRequest('/cursus', token),
        apiRequest(`/courses?cursus_id=${id}`, token),
        token ? apiRequest('/user/progress', token) : Promise.resolve({ ok: false }),
        apiRequest(`/cursus/${id}/scholars`, token),
      ]);

      if (cursusRes.ok) {
        const allCursus = await cursusRes.json();
        const found = allCursus.find((c: any) => c.id === id);
        setCursus(found || null);
      }

      if (scholarsRes.ok) {
        const scholarsData = await scholarsRes.json();
        setScholars(scholarsData || []);
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

      if (coursesRes.ok) {
        const rawCourses = await coursesRes.json();
        
        // Enrich courses with status and episodes
        const enrichedCourses: Course[] = await Promise.all(
          rawCourses.map(async (course: any) => {
            // Get playlist for this course
            let episodes: Episode[] = [];
            let courseProgress = 0;
            let currentEpisode = 0;
            let status: CourseStatus = 'todo';
            let completedEpisodes = 0;

            try {
              const playlistRes = await apiRequest(`/courses/${course.id}/playlist`, token);
              if (playlistRes.ok) {
                const playlist = await playlistRes.json();
                episodes = playlist.map((ep: any, idx: number) => {
                  const epProgress = progressMap[ep.audio_id];
                  let epStatus: EpisodeStatus = 'todo';
                  
                  if (epProgress) {
                    if (epProgress.completed || epProgress.progress >= 0.9) {
                      epStatus = 'done';
                      completedEpisodes++;
                    } else if (epProgress.progress > 0) {
                      epStatus = 'active';
                      currentEpisode = idx + 1;
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

                // Determine course status
                if (completedEpisodes === episodes.length && episodes.length > 0) {
                  status = 'done';
                  courseProgress = 100;
                } else if (completedEpisodes > 0 || currentEpisode > 0) {
                  status = 'active';
                  courseProgress = Math.round((completedEpisodes / episodes.length) * 100);
                  // Find first non-done episode as current
                  if (currentEpisode === 0) {
                    const firstActive = episodes.findIndex(e => e.status !== 'done');
                    currentEpisode = firstActive >= 0 ? firstActive + 1 : 1;
                  }
                }
              }
            } catch (e) {
              console.error('Error loading playlist:', e);
            }

            return {
              id: course.id,
              title: course.title || 'Sans titre',
              description: course.description,
              scholar_name: course.scholar_name,
              modules_count: course.modules_count || episodes.length,
              duration: course.duration || 0,
              status,
              progress: courseProgress,
              current_episode: currentEpisode,
              episodes,
            };
          })
        );

        setCourses(enrichedCourses);

        // Auto-expand the active course
        const activeCourse = enrichedCourses.find(c => c.status === 'active');
        if (activeCourse) {
          setExpandedCourseId(activeCourse.id);
        }
      }
    } catch (e) {
      console.error('Load cursus courses error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, token]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = () => { setRefreshing(true); loadData(); };

  // ─── Toggle Accordion ───────────────────────────────────────────────────────
  const toggleCourse = (courseId: string) => {
    setExpandedCourseId(prev => prev === courseId ? null : courseId);
  };

  // ─── Navigation ─────────────────────────────────────────────────────────────
  const goToEpisode = (episodeId: string, courseId: string) => {
    router.push(`/audio/${episodeId}?course_id=${courseId}&autoplay=1` as any);
  };

  const goToCourse = (courseId: string) => {
    router.push(`/course/${courseId}` as any);
  };

  // ─── Computed Stats ─────────────────────────────────────────────────────────
  const totalEpisodes = courses.reduce((sum, c) => sum + c.modules_count, 0);
  const totalDuration = courses.reduce((sum, c) => sum + c.duration, 0);
  const completedEpisodes = courses.reduce((sum, c) => {
    return sum + (c.episodes?.filter(e => e.status === 'done').length || 0);
  }, 0);
  const globalProgress = totalEpisodes > 0 ? Math.round((completedEpisodes / totalEpisodes) * 100) : 0;
  const remainingEpisodes = totalEpisodes - completedEpisodes;

  // ─── Categorize Courses ─────────────────────────────────────────────────────
  const activeCourses = courses.filter(c => c.status === 'active');
  const todoCourses = courses.filter(c => c.status === 'todo');
  const doneCourses = courses.filter(c => c.status === 'done');

  // ─── Loading State ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#04D182" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={cursusColor} />
        }
      >
        {/* ═══════════════════════════════════════════════════════════════════════
            1. HERO CURSUS
        ═══════════════════════════════════════════════════════════════════════ */}
        <View style={styles.hero}>
          {/* Radial glow effect */}
          <View style={[styles.heroGlow, { backgroundColor: `${cursusColor}12` }]} pointerEvents="none" />
          
          {/* Left border gradient */}
          <View style={[styles.heroLeftBorder, { backgroundColor: cursusColor }]} />

          {/* Navigation */}
          <View style={[styles.heroNav, { paddingTop: STATUS_BAR_HEIGHT + 10 }]}>
            <TouchableOpacity
              testID="cursus-back-btn"
              style={styles.backBtn}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={18} color="rgba(245,240,232,0.6)" />
              <Text style={styles.backLabel}>Cursus</Text>
            </TouchableOpacity>
            <View style={styles.heroNavRight}>
              <TouchableOpacity style={styles.navIconBtn}>
                <Ionicons name="search-outline" size={18} color="rgba(245,240,232,0.6)" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.navIconBtn}>
                <Ionicons name="ellipsis-horizontal" size={18} color="rgba(245,240,232,0.6)" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Eyebrow */}
          <View style={styles.heroEyebrow}>
            <View style={[styles.heroEyebrowLine, { backgroundColor: cursusColor }]} />
            <Text style={[styles.heroEyebrowText, { color: cursusColor }]}>
              Cursus {cursusLetter} · {cursus?.short_name || cursus?.name?.split(' ')[0] || 'Falsafa'}
            </Text>
          </View>

          {/* Title */}
          <Text style={styles.heroTitle} testID="cursus-title">
            {cursus?.name || `Cursus ${cursusLetter}`}
          </Text>

          {/* Description */}
          {cursus?.description ? (
            <Text style={styles.heroDesc} numberOfLines={3}>{cursus.description}</Text>
          ) : null}

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{courses.length}</Text>
              <Text style={styles.statLabel}>Cours</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{totalEpisodes}</Text>
              <Text style={styles.statLabel}>Épisodes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{fmtDur(totalDuration)}</Text>
              <Text style={styles.statLabel}>Durée totale</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={[styles.statValue, { color: cursusColor }]}>{globalProgress}%</Text>
              <Text style={styles.statLabel}>Complété</Text>
            </View>
          </View>

          {/* Global Progress Bar */}
          <View style={styles.globalProgressWrap}>
            <ProgressBar progress={globalProgress} color={cursusColor} height={2} />
            <View style={styles.globalProgressLabels}>
              <Text style={[styles.globalProgressLeft, { color: cursusColor }]}>
                {globalProgress}% — {completedEpisodes} épisodes écoutés
              </Text>
              <Text style={styles.globalProgressRight}>
                {remainingEpisodes} restants
              </Text>
            </View>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════════
            2. STICKY TABS
        ═══════════════════════════════════════════════════════════════════════ */}
        <View style={styles.tabsWrap}>
          {(['cours', 'professeurs', 'ressources'] as TabKey[]).map(tab => {
            const isActive = activeTab === tab;
            const label = tab === 'cours' ? 'Cours' : tab === 'professeurs' ? 'Professeurs' : 'Ressources';
            return (
              <TouchableOpacity
                key={tab}
                testID={`tab-${tab}`}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ═══════════════════════════════════════════════════════════════════════
            3. TAB CONTENT
        ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'cours' && (
          <View style={styles.coursesContainer}>
            {/* Section: En cours */}
            {activeCourses.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>En cours</Text>
                {activeCourses.map((course, idx) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    index={courses.findIndex(c => c.id === course.id)}
                    cursusColor={cursusColor}
                    cursusLetter={cursusLetter}
                    isExpanded={expandedCourseId === course.id}
                    onToggle={() => toggleCourse(course.id)}
                    onEpisodePress={(epId) => goToEpisode(epId, course.id)}
                    onContinue={() => {
                      const currentEp = course.episodes?.find(e => e.status === 'active') || course.episodes?.[0];
                      if (currentEp) goToEpisode(currentEp.id, course.id);
                    }}
                  />
                ))}
              </>
            )}

            {/* Section: À venir */}
            {todoCourses.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>À venir</Text>
                {todoCourses.map((course, idx) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    index={courses.findIndex(c => c.id === course.id)}
                    cursusColor={cursusColor}
                    cursusLetter={cursusLetter}
                    isExpanded={expandedCourseId === course.id}
                    onToggle={() => toggleCourse(course.id)}
                    onEpisodePress={(epId) => goToEpisode(epId, course.id)}
                    onContinue={() => {
                      const firstEp = course.episodes?.[0];
                      if (firstEp) goToEpisode(firstEp.id, course.id);
                    }}
                  />
                ))}
              </>
            )}

            {/* Section: Terminés */}
            {doneCourses.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Terminés</Text>
                {doneCourses.map((course, idx) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    index={courses.findIndex(c => c.id === course.id)}
                    cursusColor={cursusColor}
                    cursusLetter={cursusLetter}
                    isExpanded={expandedCourseId === course.id}
                    onToggle={() => toggleCourse(course.id)}
                    onEpisodePress={(epId) => goToEpisode(epId, course.id)}
                    onContinue={() => {
                      const firstEp = course.episodes?.[0];
                      if (firstEp) goToEpisode(firstEp.id, course.id);
                    }}
                  />
                ))}
              </>
            )}

            {courses.length === 0 && (
              <Text style={styles.emptyText}>Aucun cours disponible pour ce cursus.</Text>
            )}
          </View>
        )}

        {activeTab === 'professeurs' && (
          <View style={styles.scholarsTab}>
            {scholars.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="school-outline" size={40} color="#333" />
                <Text style={styles.emptyTitle}>Aucun professeur</Text>
                <Text style={styles.emptyText}>Les professeurs de ce cursus apparaîtront ici.</Text>
              </View>
            ) : (
              scholars.map((scholar, idx) => (
                <TouchableOpacity
                  key={scholar.id}
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
                    <Text style={styles.scholarName}>{scholar.name}</Text>
                    {scholar.title ? (
                      <Text style={styles.scholarTitle}>{scholar.title}</Text>
                    ) : null}
                    <Text style={styles.scholarCoursesCount}>
                      {scholar.courses_count} cours dans ce cursus
                    </Text>
                    {scholar.courses && scholar.courses.length > 0 && (
                      <View style={styles.scholarCoursesList}>
                        {scholar.courses.slice(0, 3).map((c: any) => (
                          <Text key={c.id} style={styles.scholarCourseItem}>• {c.title}</Text>
                        ))}
                        {scholar.courses.length > 3 && (
                          <Text style={[styles.scholarCourseItem, { color: cursusColor }]}>
                            + {scholar.courses.length - 3} autre{scholar.courses.length - 3 > 1 ? 's' : ''}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#777" />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {activeTab === 'ressources' && (
          <View style={styles.resourcesTab}>
            <View style={styles.emptyState}>
              <Ionicons name="library-outline" size={40} color="#333" />
              <Text style={styles.emptyTitle}>Ressources à venir</Text>
              <Text style={styles.emptyText}>
                Bibliographies, articles et liens complémentaires seront disponibles prochainement.
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

// ─── Course Card Component ────────────────────────────────────────────────────
interface CourseCardProps {
  course: Course;
  index: number;
  cursusColor: string;
  cursusLetter: string;
  isExpanded: boolean;
  onToggle: () => void;
  onEpisodePress: (episodeId: string) => void;
  onContinue: () => void;
}

function CourseCard({
  course,
  index,
  cursusColor,
  cursusLetter,
  isExpanded,
  onToggle,
  onEpisodePress,
  onContinue,
}: CourseCardProps) {
  const [hovered, setHovered] = useState(false);
  const hoverProps = Platform.OS === 'web' ? {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  } : {};

  const isActive = course.status === 'active';
  const isDone = course.status === 'done';

  // Number color based on status
  const numColor = isDone ? `${cursusColor}59` : isActive ? cursusColor : '#444444';
  
  // Title color based on status
  const titleColor = isDone ? 'rgba(245,240,232,0.50)' : '#F5F0E8';

  // Scholar initials
  const scholarInitials = course.scholar_name
    ? course.scholar_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '';

  // Remaining duration
  const remainingDuration = course.duration
    ? Math.round(course.duration * (1 - (course.progress || 0) / 100))
    : 0;

  return (
    <View style={styles.courseCardWrap}>
      {/* Card Header (always visible) */}
      <TouchableOpacity
        testID={`course-card-${course.id}`}
        style={[
          styles.courseCard,
          isActive && [styles.courseCardActive, { borderLeftColor: cursusColor }],
          hovered && !isDone && styles.courseCardHover,
        ]}
        onPress={onToggle}
        activeOpacity={0.8}
        {...hoverProps}
      >
        {/* Column 1: Number */}
        <Text style={[styles.courseNum, { color: numColor }]}>
          {String(index + 1).padStart(2, '0')}
        </Text>

        {/* Column 2: Status Icon */}
        <StatusIcon status={course.status} color={cursusColor} />

        {/* Column 3: Info */}
        <View style={styles.courseInfo}>
          {/* Professor (only for active) */}
          {isActive && course.scholar_name && (
            <View style={styles.scholarRow}>
              <View style={[styles.scholarAvatar, { backgroundColor: `${cursusColor}1A` }]}>
                <Text style={[styles.scholarInitials, { color: cursusColor }]}>{scholarInitials}</Text>
              </View>
              <Text style={styles.scholarName}>{course.scholar_name}</Text>
            </View>
          )}

          {/* Title */}
          <Text style={[styles.courseTitle, { color: titleColor }]} numberOfLines={1}>
            {course.title}
          </Text>

          {/* Meta */}
          <View style={styles.courseMeta}>
            <Text style={styles.courseMetaText}>
              {course.modules_count} épisodes
            </Text>
            {course.duration > 0 && (
              <>
                <View style={styles.metaDot} />
                <Text style={styles.courseMetaText}>{fmtDur(course.duration)}</Text>
              </>
            )}
            {isActive && course.current_episode && (
              <>
                <View style={styles.metaDot} />
                <Text style={[styles.courseMetaText, { color: cursusColor }]}>
                  Ép. {course.current_episode} en cours
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Column 4: Right (Chevron or Badge) */}
        {isDone ? (
          <View style={styles.doneBadge}>
            <Ionicons name="checkmark" size={8} color={cursusColor} />
            <Text style={[styles.doneBadgeText, { color: cursusColor }]}>Terminé</Text>
          </View>
        ) : (
          <Ionicons
            name="chevron-forward"
            size={14}
            color={isActive ? cursusColor : '#444444'}
            style={[
              styles.chevron,
              isExpanded && styles.chevronExpanded,
            ]}
          />
        )}
      </TouchableOpacity>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* Course Progress Bar */}
          {(course.progress || 0) > 0 && (
            <View style={styles.courseProgressWrap}>
              <ProgressBar progress={course.progress || 0} color={cursusColor} height={2} />
              <Text style={[styles.courseProgressText, { color: cursusColor }]}>
                {course.progress}% complété{remainingDuration > 0 ? ` · ${fmtDur(remainingDuration)} restantes` : ''}
              </Text>
            </View>
          )}

          {/* Description */}
          {course.description && (
            <Text style={styles.courseDesc}>{course.description}</Text>
          )}

          {/* Episodes Label */}
          {course.episodes && course.episodes.length > 0 && (
            <Text style={styles.episodesLabel}>{course.episodes.length} épisodes</Text>
          )}

          {/* Episodes List */}
          {course.episodes?.map((ep, idx) => (
            <TouchableOpacity
              key={ep.id}
              testID={`episode-${ep.id}`}
              style={[
                styles.episodeRow,
                idx < (course.episodes?.length || 0) - 1 && styles.episodeRowBorder,
              ]}
              onPress={() => onEpisodePress(ep.id)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.episodeNum,
                { color: ep.status === 'active' ? cursusColor : '#444444' },
              ]}>
                {String(ep.number).padStart(2, '0')}
              </Text>
              <Text style={[
                styles.episodeTitle,
                { color: ep.status === 'active' ? '#F5F0E8' : 'rgba(245,240,232,0.75)' },
              ]} numberOfLines={1}>
                {ep.title}
              </Text>
              <Text style={[
                styles.episodeDuration,
                { color: ep.status === 'active' ? cursusColor : '#777777' },
              ]}>
                {fmtDurShort(ep.duration)}
              </Text>
              <EpisodePlayBtn status={ep.status} color={cursusColor} size={28} />
            </TouchableOpacity>
          ))}

          {/* Action Buttons */}
          <View style={styles.actionBtns}>
            <TouchableOpacity
              testID={`course-continue-${course.id}`}
              style={[styles.btnPrimary, { backgroundColor: cursusColor }]}
              onPress={onContinue}
            >
              <Text style={styles.btnPrimaryText}>
                {(course.progress || 0) > 0 ? 'Continuer' : 'Commencer'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary}>
              <Ionicons name="bookmark-outline" size={14} color="#C9A84C" />
              <Text style={styles.btnSecondaryText}>Sauvegarder</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  loadingWrap: { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' },

  // ─── HERO ─────────────────────────────────────────────────────────────────
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
    fontSize: 22,
    fontWeight: '400',
    color: '#F5F0E8',
    letterSpacing: 1,
    lineHeight: 29,
    paddingHorizontal: 20,
    marginBottom: 8,
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
    marginBottom: 18,
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
  globalProgressWrap: {
    paddingHorizontal: 20,
  },
  progressTrack: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  globalProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  globalProgressLeft: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  globalProgressRight: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    letterSpacing: 2,
    color: '#777777',
    textTransform: 'uppercase',
  },

  // ─── TABS ─────────────────────────────────────────────────────────────────
  tabsWrap: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10,10,10,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
    paddingHorizontal: 20,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(12px)' } as any : {}),
  },
  tab: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#04D182',
  },
  tabText: {
    fontFamily: 'Cinzel',
    fontSize: 8,
    letterSpacing: 3,
    color: '#777777',
    textTransform: 'uppercase',
  },
  tabTextActive: {
    color: '#F5F0E8',
  },

  // ─── COURSES CONTAINER ────────────────────────────────────────────────────
  coursesContainer: {
    paddingBottom: 20,
  },
  sectionLabel: {
    fontFamily: 'Cinzel',
    fontSize: 8,
    letterSpacing: 4,
    color: '#777777',
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
  emptyText: {
    fontFamily: 'EBGaramond',
    fontSize: 14,
    color: '#777777',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 40,
  },

  // ─── COURSE CARD ──────────────────────────────────────────────────────────
  courseCardWrap: {
    marginBottom: 2,
  },
  courseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#111111',
    paddingVertical: 16,
    paddingRight: 20,
    paddingLeft: 17,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    ...(Platform.OS === 'web' ? { transition: 'background-color 0.2s ease' } as any : {}),
  },
  courseCardActive: {
    backgroundColor: '#1A1A1A',
  },
  courseCardHover: {
    backgroundColor: '#1A1A1A',
  },
  courseNum: {
    fontFamily: 'Cinzel',
    fontSize: 18,
    fontWeight: '600',
    width: 28,
    textAlign: 'center',
    lineHeight: 22,
    flexShrink: 0,
  },
  statusCircle: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statusCircleInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  courseInfo: {
    flex: 1,
    minWidth: 0,
  },
  scholarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  scholarAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scholarInitials: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    fontWeight: '600',
  },
  scholarName: {
    fontFamily: 'EBGaramond',
    fontSize: 12,
    fontStyle: 'italic',
    color: '#C9A84C',
  },
  courseTitle: {
    fontFamily: 'Cinzel',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  courseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 0,
  },
  courseMetaText: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    letterSpacing: 1,
    color: '#777777',
    textTransform: 'uppercase',
  },
  metaDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#444444',
    marginHorizontal: 6,
  },
  chevron: {
    flexShrink: 0,
    ...(Platform.OS === 'web' ? { transition: 'transform 0.2s ease' } as any : {}),
  },
  chevronExpanded: {
    transform: [{ rotate: '90deg' }],
  },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(4,209,130,0.08)',
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  doneBadgeText: {
    fontFamily: 'Cinzel',
    fontSize: 6,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // ─── EXPANDED CONTENT ─────────────────────────────────────────────────────
  expandedContent: {
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: '#222222',
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  courseProgressWrap: {
    marginTop: 14,
    marginBottom: 14,
  },
  courseProgressText: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  courseDesc: {
    fontFamily: 'EBGaramond',
    fontSize: 13,
    color: 'rgba(245,240,232,0.55)',
    lineHeight: 22,
    marginBottom: 16,
  },
  episodesLabel: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    letterSpacing: 3,
    color: '#777777',
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  // ─── EPISODE ROW ──────────────────────────────────────────────────────────
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
  },
  episodeRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(34,34,34,0.6)',
  },
  episodeNum: {
    fontFamily: 'Cinzel',
    fontSize: 9,
    letterSpacing: 1,
    width: 22,
    textAlign: 'center',
    flexShrink: 0,
  },
  episodeTitle: {
    fontFamily: 'EBGaramond',
    fontSize: 13,
    flex: 1,
  },
  episodeDuration: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    letterSpacing: 1,
    textTransform: 'uppercase',
    flexShrink: 0,
  },
  epPlayBtn: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // ─── ACTION BUTTONS ───────────────────────────────────────────────────────
  actionBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  btnPrimary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  btnPrimaryText: {
    fontFamily: 'Cinzel',
    fontSize: 8,
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
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  btnSecondaryText: {
    fontFamily: 'Cinzel',
    fontSize: 8,
    letterSpacing: 2,
    color: '#C9A84C',
    textTransform: 'uppercase',
  },

  // ─── SCHOLARS TAB ────────────────────────────────────────────────────────────
  scholarsTab: {
    paddingBottom: 20,
  },
  scholarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  scholarCardBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  scholarPhoto: {
    width: 56,
    height: 56,
    flexShrink: 0,
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
  scholarPhotoImg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    backgroundColor: '#1A1A1A',
  },
  scholarInitial: {
    fontFamily: 'Cinzel',
    fontSize: 18,
    fontWeight: '600',
    color: '#F5F0E8',
  },
  scholarInfo: {
    flex: 1,
  },
  scholarName: {
    fontFamily: 'Cinzel',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    color: '#F5F0E8',
    marginBottom: 3,
  },
  scholarTitle: {
    fontFamily: 'EBGaramond',
    fontSize: 12,
    fontStyle: 'italic',
    color: '#C9A84C',
    marginBottom: 4,
  },
  scholarCoursesCount: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    letterSpacing: 2,
    color: '#777777',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  scholarCoursesList: {
    marginTop: 4,
  },
  scholarCourseItem: {
    fontFamily: 'EBGaramond',
    fontSize: 11,
    color: 'rgba(245,240,232,0.55)',
    lineHeight: 16,
  },

  // ─── RESOURCES TAB ───────────────────────────────────────────────────────────
  resourcesTab: {
    paddingBottom: 20,
  },

  // ─── EMPTY STATE ─────────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: 'Cinzel',
    fontSize: 12,
    letterSpacing: 2,
    color: '#F5F0E8',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: 'EBGaramond',
    fontSize: 14,
    color: '#777777',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
});
