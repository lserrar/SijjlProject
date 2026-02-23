import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth, apiRequest } from '../../context/AuthContext';
import { spacing } from '../../constants/theme';
import { formatDuration } from '../../constants/mockData';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [homeData, setHomeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHome = useCallback(async () => {
    try {
      const resp = await apiRequest('/home', token);
      const data = await resp.json();
      setHomeData(data);
    } catch (e) {
      console.error('Home fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchHome(); }, [fetchHome]);
  const onRefresh = () => { setRefreshing(true); fetchHome(); };

  const goToCourse = (id: string) => router.push(`/course/${id}` as any);
  const goToAudio = (id: string) => router.push(`/audio/${id}` as any);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const firstName = user?.name?.split(' ')[0] || 'vous';

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#04D182" />
      </View>
    );
  }

  const {
    featured_course,
    continue_watching = [],
    recent_episodes = [],
    recommendations = [],
    scholars = [],
    top5_courses = [],
  } = homeData || {};

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#04D182" />}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingLabel}>{greeting.toUpperCase()}</Text>
            <Text style={styles.greetingName}>{firstName.toUpperCase()}</Text>
          </View>
          <TouchableOpacity
            testID="home-search-btn"
            style={styles.searchBtn}
            onPress={() => router.push('/search' as any)}
          >
            <Ionicons name="search" size={18} color="#F5F0E8" />
          </TouchableOpacity>
        </View>

        <GoldLine />

        {/* ── Hero (featured course — no image) ── */}
        {featured_course && (
          <View style={styles.heroWrap}>
            <View style={styles.heroCursusTag}>
              <Text style={[styles.cursusTagText, { color: featured_course.cursus_color || '#04D182' }]}>
                À LA UNE · CURSUS {featured_course.cursus_letter || 'A'}
              </Text>
            </View>
            <Text style={styles.heroTitle} testID="home-featured-title">
              {featured_course.title}
            </Text>
            {featured_course.description ? (
              <Text style={styles.heroDesc} numberOfLines={3}>
                {featured_course.description}
              </Text>
            ) : null}
            <Text style={styles.heroScholar}>
              {featured_course.scholar_name ? `Prof. ${featured_course.scholar_name}` : ''}
            </Text>
            <View style={styles.heroMeta}>
              {featured_course.modules_count > 0 && (
                <Text style={styles.heroMetaText}>
                  {featured_course.modules_count} ÉPISODE{featured_course.modules_count > 1 ? 'S' : ''}
                </Text>
              )}
              {featured_course.modules_count > 0 && featured_course.duration > 0 && (
                <Text style={styles.heroMetaDot}>·</Text>
              )}
              {featured_course.duration > 0 && (
                <Text style={styles.heroMetaText}>{formatDuration(featured_course.duration)}</Text>
              )}
            </View>
            <TouchableOpacity
              testID="home-hero-start-btn"
              style={styles.heroBtn}
              onPress={() => goToCourse(featured_course.id)}
            >
              <Ionicons name="play" size={12} color="#0A0A0A" />
              <Text style={styles.heroBtnText}>COMMENCER</Text>
            </TouchableOpacity>
          </View>
        )}

        <GoldLine />

        {/* ── Reprendre la lecture ── */}
        {continue_watching.length > 0 && (
          <Section label="REPRENDRE LA LECTURE">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
              {continue_watching.map((item: any) => (
                <TouchableOpacity
                  key={item.audio.id}
                  testID={`home-continue-${item.audio.id}`}
                  style={styles.episodeCard}
                  onPress={() => goToAudio(item.audio.id)}
                >
                  <CursusTag letter={item.audio.cursus_letter || 'A'} name={item.audio.cursus_name} color={item.audio.cursus_color || '#04D182'} />
                  <Text style={styles.epCardTitle} numberOfLines={3}>{item.audio.title}</Text>
                  <View style={styles.progressBarOuter}>
                    <View style={[styles.progressBarInner, { width: `${(item.progress || 0) * 100}%` as any }]} />
                  </View>
                  <Text style={styles.epCardDuration}>{formatSeconds(item.position)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Section>
        )}

        {/* ── Nouveaux épisodes ── */}
        {recent_episodes.length > 0 && (
          <Section label="NOUVEAUX ÉPISODES" seeAll={() => router.push('/(tabs)/cursus' as any)}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
              {recent_episodes.map((ep: any) => (
                <TouchableOpacity
                  key={ep.id}
                  testID={`home-ep-${ep.id}`}
                  style={styles.episodeCard}
                  onPress={() => goToAudio(ep.id)}
                >
                  <CursusTag letter={ep.cursus_letter || 'A'} name={ep.cursus_name} color={ep.cursus_color || '#04D182'} />
                  <Text style={styles.epCardTitle} numberOfLines={3}>{ep.title}</Text>
                  {ep.duration > 0 && <Text style={styles.epCardDuration}>{formatDuration(ep.duration)}</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Section>
        )}

        <GoldLine />

        {/* ── Recommandé pour vous ── */}
        {recommendations.length > 0 && (
          <Section label="RECOMMANDÉ POUR VOUS" seeAll={() => router.push('/(tabs)/cursus' as any)}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
              {recommendations.map((course: any) => (
                <TouchableOpacity
                  key={course.id}
                  testID={`home-rec-${course.id}`}
                  style={styles.courseCard}
                  onPress={() => goToCourse(course.id)}
                >
                  <CursusTag letter={course.cursus_letter || 'A'} name={course.cursus_name} color={course.cursus_color || '#04D182'} />
                  <Text style={styles.courseCardTitle} numberOfLines={3}>{course.title}</Text>
                  {course.description ? (
                    <Text style={styles.courseCardDesc} numberOfLines={2}>{course.description}</Text>
                  ) : null}
                  <Text style={styles.courseCardScholar} numberOfLines={1}>
                    {course.scholar_name ? `Prof. ${course.scholar_name}` : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Section>
        )}

        <GoldLine />

        {/* ── Professeurs ── */}
        {scholars.length > 0 && (
          <Section label="PROFESSEURS">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
              {scholars.map((s: any) => (
                <TouchableOpacity
                  key={s.id}
                  testID={`home-scholar-${s.id}`}
                  style={styles.scholarCard}
                  onPress={() => router.push(`/scholar/${s.id}` as any)}
                >
                  <View style={styles.scholarAvatar}>
                    <Text style={styles.scholarInitial}>
                      {(s.name || 'S').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.scholarName} numberOfLines={2}>
                    {s.name?.split(' ').slice(-1)[0]?.toUpperCase() || 'PROF.'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Section>
        )}

        <GoldLine />

        {/* ── Top 5 du mois ── */}
        {top5_courses.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionLabel}>TOP 5 DU MOIS</Text>
                <Text style={styles.sectionSub}>{getMonthLabel()}</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(tabs)/cursus' as any)}>
                <Text style={styles.seeAllText}>Voir le classement →</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.top5List}>
              {top5_courses.map((course: any, idx: number) => (
                <TouchableOpacity
                  key={course.id}
                  testID={`home-top5-${course.id}`}
                  style={[styles.top5Item, idx < top5_courses.length - 1 && styles.top5ItemBorder]}
                  onPress={() => goToCourse(course.id)}
                >
                  <Text style={styles.top5Rank}>{idx + 1}</Text>
                  <View style={styles.top5Info}>
                    <CursusTag letter={course.cursus_letter || 'A'} name={course.cursus_name} color={course.cursus_color || '#04D182'} />
                    <Text style={styles.top5Title} numberOfLines={2}>{course.title}</Text>
                    <Text style={styles.top5Scholar}>
                      {course.scholar_name ? `Prof. ${course.scholar_name}` : ''}
                    </Text>
                  </View>
                  <View style={[styles.top5ColorStrip, { backgroundColor: course.cursus_color || '#04D182' }]} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function GoldLine() {
  return <View style={styles.goldLine} />;
}

function Section({ label, seeAll, children }: { label: string; seeAll?: () => void; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>{label}</Text>
        {seeAll && (
          <TouchableOpacity onPress={seeAll}>
            <Text style={styles.seeAllText}>Voir tout →</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

function CursusTag({ letter, name, color }: { letter: string; name?: string; color: string }) {
  const display = name ? `CURSUS ${letter} · ${name.toUpperCase()}` : `CURSUS ${letter}`;
  return (
    <Text style={[styles.cursusTag, { color }]} numberOfLines={1}>
      {display}
    </Text>
  );
}

function getMonthLabel() {
  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const now = new Date();
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
}

function formatSeconds(seconds: number): string {
  if (!seconds || seconds <= 0) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')} restant`;
}

// ── Styles ─────────────────────────────────────────────────────────────────

const EPISODE_CARD_W = Math.min(140, width * 0.37);
const COURSE_CARD_W = Math.min(160, width * 0.42);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A0A' },
  scroll: { flex: 1 },
  loadingWrap: { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  greetingLabel: {
    fontFamily: 'Cinzel',
    fontSize: 8,
    color: '#888888',
    letterSpacing: 4,
  },
  greetingName: {
    fontFamily: 'Cinzel',
    fontSize: 22,
    color: '#F5F0E8',
    letterSpacing: 6,
    marginTop: 4,
  },
  searchBtn: {
    width: 38,
    height: 38,
    borderWidth: 1,
    borderColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
  },

  // Gold separator
  goldLine: {
    height: 1,
    backgroundColor: '#C9A84C',
    opacity: 0.2,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
  },

  // Hero (no image)
  heroWrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  heroCursusTag: { marginBottom: spacing.sm },
  cursusTagText: {
    fontFamily: 'Cinzel',
    fontSize: 8,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily: 'Cinzel',
    fontSize: 26,
    color: '#F5F0E8',
    lineHeight: 36,
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  heroDesc: {
    fontFamily: 'EB Garamond',
    fontStyle: 'italic',
    fontSize: 16,
    color: '#888888',
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  heroScholar: {
    fontFamily: 'EB Garamond',
    fontStyle: 'italic',
    fontSize: 14,
    color: '#C9A84C',
    marginBottom: spacing.sm,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.lg,
  },
  heroMetaText: {
    fontFamily: 'Cinzel',
    fontSize: 8,
    color: '#888888',
    letterSpacing: 2,
  },
  heroMetaDot: {
    fontFamily: 'Cinzel',
    fontSize: 10,
    color: '#444444',
  },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#04D182',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  heroBtnText: {
    fontFamily: 'Cinzel',
    fontSize: 9,
    color: '#0A0A0A',
    letterSpacing: 4,
  },

  // Sections
  section: { marginBottom: spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontFamily: 'Cinzel',
    fontSize: 9,
    color: '#04D182',
    letterSpacing: 5,
    textTransform: 'uppercase',
  },
  sectionSub: {
    fontFamily: 'EB Garamond',
    fontStyle: 'italic',
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
  seeAllText: {
    fontFamily: 'EB Garamond',
    fontStyle: 'italic',
    fontSize: 13,
    color: '#C9A84C',
  },
  hList: { paddingHorizontal: spacing.lg, gap: spacing.md },

  // Cursus tag
  cursusTag: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },

  // Episode cards (text-only)
  episodeCard: {
    width: EPISODE_CARD_W,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#222222',
    padding: spacing.sm + 4,
    justifyContent: 'space-between',
    minHeight: 120,
  },
  epCardTitle: {
    fontFamily: 'Cinzel',
    fontSize: 11,
    color: '#F5F0E8',
    lineHeight: 16,
    letterSpacing: 0.3,
    flex: 1,
  },
  epCardDuration: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    color: '#888888',
    letterSpacing: 1,
    marginTop: 8,
  },

  // Progress bar
  progressBarOuter: {
    height: 2,
    backgroundColor: '#222222',
    marginTop: 8,
  },
  progressBarInner: {
    height: 2,
    backgroundColor: '#04D182',
  },

  // Course cards (text-only, taller)
  courseCard: {
    width: COURSE_CARD_W,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#222222',
    padding: spacing.md,
    minHeight: 160,
    justifyContent: 'space-between',
  },
  courseCardTitle: {
    fontFamily: 'Cinzel',
    fontSize: 12,
    color: '#F5F0E8',
    lineHeight: 18,
    letterSpacing: 0.3,
    flex: 1,
  },
  courseCardDesc: {
    fontFamily: 'EB Garamond',
    fontStyle: 'italic',
    fontSize: 12,
    color: '#888888',
    lineHeight: 16,
    marginTop: 6,
  },
  courseCardScholar: {
    fontFamily: 'EB Garamond',
    fontStyle: 'italic',
    fontSize: 11,
    color: '#C9A84C',
    marginTop: 6,
  },

  // Scholars
  scholarCard: { alignItems: 'center', width: 68, gap: 6 },
  scholarAvatar: {
    width: 56,
    height: 56,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scholarInitial: {
    fontFamily: 'Cinzel',
    fontSize: 18,
    color: '#C9A84C',
  },
  scholarName: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    color: '#888888',
    textAlign: 'center',
    letterSpacing: 1,
  },

  // Top 5
  top5List: {
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: '#222222',
  },
  top5Item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: '#111111',
  },
  top5ItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  top5Rank: {
    fontFamily: 'Cinzel',
    fontSize: 36,
    color: 'rgba(201,168,76,0.25)',
    width: 44,
    textAlign: 'center',
    lineHeight: 44,
  },
  top5Info: {
    flex: 1,
  },
  top5Title: {
    fontFamily: 'Cinzel',
    fontSize: 12,
    color: '#F5F0E8',
    lineHeight: 17,
    letterSpacing: 0.3,
    marginTop: 4,
  },
  top5Scholar: {
    fontFamily: 'EB Garamond',
    fontStyle: 'italic',
    fontSize: 12,
    color: '#888888',
    marginTop: 4,
  },
  top5ColorStrip: {
    width: 3,
    alignSelf: 'stretch',
    opacity: 0.6,
  },
});
