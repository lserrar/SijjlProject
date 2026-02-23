import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, apiRequest } from '../../context/AuthContext';
import { colors, spacing, radius } from '../../constants/theme';
import { formatDuration } from '../../constants/mockData';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.min(160, width * 0.42);
const EPISODE_CARD_WIDTH = 150;
const EPISODE_CARD_HEIGHT = 90;

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

  const goToCourse = (courseId: string) => router.push(`/course/${courseId}` as any);
  const goToAudio = (audioId: string) => router.push(`/audio/${audioId}` as any);

  const firstName = user?.name?.split(' ')[0] || 'vous';
  const hour = new Date().getHours();
  const greetingText = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    );
  }

  const {
    featured_course,
    continue_watching = [],
    recommendations = [],
    scholars = [],
    top10_courses = [],
    course_bandeaux = [],
  } = homeData || {};

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>{greetingText},</Text>
            <Text style={styles.userName}>{firstName}</Text>
          </View>
          <TouchableOpacity
            data-testid="home-search-btn"
            testID="home-search-btn"
            style={styles.searchBtn}
            onPress={() => router.push('/search' as any)}
          >
            <Ionicons name="search" size={22} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* ── Featured Course (Hero Netflix) ── */}
        {featured_course && (
          <TouchableOpacity
            testID="home-featured-course"
            style={styles.heroCard}
            onPress={() => goToCourse(featured_course.id)}
            activeOpacity={0.95}
          >
            <Image
              source={{ uri: featured_course.thumbnail || 'https://via.placeholder.com/400x260' }}
              style={styles.heroImage}
            />
            <LinearGradient
              colors={['transparent', 'rgba(8,8,8,0.85)', 'rgba(8,8,8,1)']}
              style={styles.heroGradient}
            >
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>À LA UNE</Text>
              </View>
              <Text style={styles.heroTitle} numberOfLines={2}>{featured_course.title}</Text>
              <Text style={styles.heroScholar}>{featured_course.scholar_name}</Text>
              <View style={styles.heroMeta}>
                <MetaChip icon="book-outline" label={`${featured_course.modules_count || 0} épisodes`} />
                <MetaChip icon="time-outline" label={formatDuration(featured_course.duration)} />
                {featured_course.level && <LevelChip level={featured_course.level} />}
              </View>
              <TouchableOpacity
                testID="home-hero-start-btn"
                style={styles.heroBtn}
                onPress={() => goToCourse(featured_course.id)}
              >
                <Ionicons name="play" size={15} color="#000" />
                <Text style={styles.heroBtnText}>Commencer</Text>
              </TouchableOpacity>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ── Reprendre la lecture ── */}
        {continue_watching.length > 0 && (
          <Section title="Reprendre la lecture" icon="play-circle-outline">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
              {continue_watching.map((item: any) => (
                <TouchableOpacity
                  key={item.audio.id}
                  testID={`home-continue-${item.audio.id}`}
                  style={styles.continueCard}
                  onPress={() => goToAudio(item.audio.id)}
                >
                  <View style={styles.continueImgWrap}>
                    <Image
                      source={{ uri: item.audio.thumbnail || item.course?.thumbnail || 'https://via.placeholder.com/160x90' }}
                      style={styles.continueImg}
                    />
                    <View style={styles.continueBadge}>
                      <Ionicons name="play" size={14} color="#000" />
                    </View>
                  </View>
                  <View style={styles.continueProgressBar}>
                    <View style={[styles.continueProgressFill, { width: `${(item.progress || 0) * 100}%` }]} />
                  </View>
                  <Text style={styles.continueTitle} numberOfLines={2}>{item.audio.title}</Text>
                  {item.position > 0 && (
                    <Text style={styles.continuePosition}>{formatSeconds(item.position)}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Section>
        )}

        {/* ── Recommandations ── */}
        {recommendations.length > 0 && (
          <Section title="Recommandé pour vous" seeAllRoute="/(tabs)/cursus">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
              {recommendations.map((course: any) => (
                <CourseCard key={course.id} course={course} onPress={() => goToCourse(course.id)} />
              ))}
            </ScrollView>
          </Section>
        )}

        {/* ── Professeurs ── */}
        {scholars.length > 0 && (
          <Section title="Professeurs" seeAllRoute="/(tabs)/explorer">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
              {scholars.map((scholar: any) => (
                <TouchableOpacity
                  key={scholar.id}
                  testID={`home-scholar-${scholar.id}`}
                  style={styles.scholarCard}
                  onPress={() => router.push(`/scholar/${scholar.id}` as any)}
                >
                  <Image
                    source={{ uri: scholar.photo_url || scholar.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(scholar.name || 'S')}&background=1a1a1a&color=04D182&bold=true&size=128` }}
                    style={styles.scholarAvatar}
                  />
                  <Text style={styles.scholarName} numberOfLines={2}>{scholar.name?.split(' ').slice(-1)[0]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Section>
        )}

        {/* ── Top 10 du mois ── */}
        {top10_courses.length > 0 && (
          <Section title="Top 10 ce mois-ci">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
              {top10_courses.slice(0, 10).map((course: any, index: number) => (
                <TouchableOpacity
                  key={course.id}
                  testID={`home-top10-${course.id}`}
                  style={styles.top10Card}
                  onPress={() => goToCourse(course.id)}
                >
                  <Text style={styles.top10Rank}>{index + 1}</Text>
                  <View style={styles.top10ImgWrap}>
                    <Image
                      source={{ uri: course.thumbnail || 'https://via.placeholder.com/100x140' }}
                      style={styles.top10Img}
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.8)']}
                      style={styles.top10Overlay}
                    >
                      <Text style={styles.top10Title} numberOfLines={2}>{course.title}</Text>
                    </LinearGradient>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Section>
        )}

        {/* ── Bandeaux par cours ── */}
        {course_bandeaux.map((course: any) => (
          <View key={course.id} style={styles.bandeau}>
            <View style={styles.bandeauHeader}>
              <View style={styles.bandeauTitleRow}>
                <Text style={styles.bandeauTitle} numberOfLines={1}>{course.title}</Text>
                <Text style={styles.bandeauCount}>{course.episodes?.length || 0} épisodes</Text>
              </View>
              <TouchableOpacity
                testID={`home-bandeau-voir-${course.id}`}
                onPress={() => goToCourse(course.id)}
              >
                <Text style={styles.bandeauSeeAll}>Voir tout</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
              {(course.episodes || []).map((ep: any, idx: number) => (
                <TouchableOpacity
                  key={ep.id}
                  testID={`home-ep-${ep.id}`}
                  style={styles.epCard}
                  onPress={() => goToAudio(ep.id)}
                >
                  <View style={styles.epImgWrap}>
                    <Image
                      source={{ uri: ep.thumbnail || course.thumbnail || 'https://via.placeholder.com/150x90' }}
                      style={styles.epImg}
                    />
                    <View style={styles.epNumberBadge}>
                      <Text style={styles.epNumberText}>Ép. {ep.episode_number || idx + 1}</Text>
                    </View>
                    <View style={styles.epPlayBtn}>
                      <Ionicons name="play" size={12} color="#fff" />
                    </View>
                  </View>
                  <Text style={styles.epTitle} numberOfLines={2}>{ep.title}</Text>
                  {ep.duration > 0 && (
                    <Text style={styles.epDuration}>{formatDuration(ep.duration)}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ))}

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Section({ title, icon, seeAllRoute, children }: any) {
  const router = useRouter();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          {icon && <Ionicons name={icon} size={16} color={colors.brand.primary} style={{ marginRight: 6 }} />}
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {seeAllRoute && (
          <TouchableOpacity onPress={() => router.push(seeAllRoute as any)}>
            <Text style={styles.seeAll}>Voir tout</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

function CourseCard({ course, onPress }: any) {
  return (
    <TouchableOpacity
      testID={`home-course-${course.id}`}
      style={styles.courseCard}
      onPress={onPress}
    >
      <Image
        source={{ uri: course.thumbnail || 'https://via.placeholder.com/160x220' }}
        style={styles.courseCardImg}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        style={styles.courseCardOverlay}
      >
        <Text style={styles.courseCardTitle} numberOfLines={2}>{course.title}</Text>
        <Text style={styles.courseCardScholar} numberOfLines={1}>{course.scholar_name}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function MetaChip({ icon, label }: any) {
  return (
    <View style={styles.metaChip}>
      <Ionicons name={icon} size={11} color={colors.text.secondary} />
      <Text style={styles.metaChipText}>{label}</Text>
    </View>
  );
}

function LevelChip({ level }: any) {
  const color = level?.toLowerCase() === 'débutant' ? '#22c55e'
    : level?.toLowerCase() === 'intermédiaire' ? '#f59e0b' : '#ef4444';
  return (
    <View style={[styles.levelChip, { borderColor: color }]}>
      <Text style={[styles.levelChipText, { color }]}>{level}</Text>
    </View>
  );
}

function getLevelColor(level: string) {
  switch (level?.toLowerCase()) {
    case 'débutant': return '#22c55e';
    case 'intermédiaire': return '#f59e0b';
    case 'avancé': return '#ef4444';
    default: return colors.brand.primary;
  }
}

function formatSeconds(seconds: number): string {
  if (!seconds || seconds <= 0) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')} restant`;
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#080808' },
  scroll: { flex: 1 },
  loadingContainer: { flex: 1, backgroundColor: '#080808', alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  greetingText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.text.secondary },
  userName: { fontFamily: 'Inter-Bold', fontSize: 26, color: colors.text.primary, letterSpacing: -0.5, marginTop: 2 },
  searchBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero card
  heroCard: { marginHorizontal: spacing.lg, borderRadius: radius.xl, overflow: 'hidden', height: 300, marginBottom: spacing.xl },
  heroImage: { width: '100%', height: '100%', position: 'absolute' },
  heroGradient: { flex: 1, justifyContent: 'flex-end', padding: spacing.lg },
  heroBadge: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  heroBadgeText: { fontFamily: 'Inter-Bold', fontSize: 9, color: '#000', letterSpacing: 1.5, textTransform: 'uppercase' },
  heroTitle: { fontFamily: 'Inter-Bold', fontSize: 20, color: '#fff', marginBottom: 4, lineHeight: 26 },
  heroScholar: { fontFamily: 'DMSans-Medium', fontSize: 13, color: colors.brand.primary, marginBottom: spacing.sm },
  heroMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaChipText: { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.text.secondary },
  levelChip: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.sm },
  levelChipText: { fontFamily: 'Inter-Medium', fontSize: 10 },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.brand.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  heroBtnText: { fontFamily: 'Inter-Bold', fontSize: 13, color: '#000' },

  // Sections
  section: { marginBottom: spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontFamily: 'Inter-Bold', fontSize: 16, color: colors.text.primary },
  seeAll: { fontFamily: 'Inter-Medium', fontSize: 12, color: colors.brand.primary },
  hList: { paddingHorizontal: spacing.lg, gap: spacing.md },

  // Continue Watching
  continueCard: { width: EPISODE_CARD_WIDTH },
  continueImgWrap: { position: 'relative' },
  continueImg: {
    width: EPISODE_CARD_WIDTH,
    height: EPISODE_CARD_HEIGHT,
    borderRadius: radius.md,
    backgroundColor: colors.background.card,
  },
  continueBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueProgressBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    marginTop: 4,
    marginBottom: 4,
  },
  continueProgressFill: { height: 3, backgroundColor: colors.brand.primary, borderRadius: 2 },
  continueTitle: { fontFamily: 'Inter-Medium', fontSize: 11, color: colors.text.primary, lineHeight: 15 },
  continuePosition: { fontFamily: 'DMSans-Regular', fontSize: 10, color: colors.text.secondary, marginTop: 2 },

  // Course Cards (Recommendations)
  courseCard: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.4,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.background.card,
  },
  courseCardImg: { width: '100%', height: '100%', position: 'absolute' },
  courseCardOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.sm,
  },
  courseCardTitle: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#fff', lineHeight: 16 },
  courseCardScholar: { fontFamily: 'DMSans-Regular', fontSize: 10, color: colors.brand.primary, marginTop: 2 },

  // Scholars
  scholarCard: { alignItems: 'center', width: 76, gap: 6 },
  scholarAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.background.card,
    borderWidth: 2,
    borderColor: 'rgba(4,209,130,0.3)',
  },
  scholarName: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  // Top 10
  top10Card: {
    width: 100,
    alignItems: 'flex-end',
  },
  top10Rank: {
    fontFamily: 'Inter-Bold',
    fontSize: 72,
    color: 'rgba(255,255,255,0.12)',
    lineHeight: 80,
    position: 'absolute',
    left: -8,
    bottom: 0,
    zIndex: 2,
  },
  top10ImgWrap: {
    width: 80,
    height: 120,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.background.card,
  },
  top10Img: { width: '100%', height: '100%' },
  top10Overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 6,
  },
  top10Title: { fontFamily: 'Inter-SemiBold', fontSize: 9, color: '#fff', lineHeight: 12 },

  // Bandeaux
  bandeau: { marginBottom: spacing.xl },
  bandeauHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  bandeauTitleRow: { flex: 1, marginRight: spacing.sm },
  bandeauTitle: { fontFamily: 'Inter-Bold', fontSize: 15, color: colors.text.primary },
  bandeauCount: { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.text.secondary, marginTop: 1 },
  bandeauSeeAll: { fontFamily: 'Inter-Medium', fontSize: 12, color: colors.brand.primary },

  // Episode Cards
  epCard: { width: EPISODE_CARD_WIDTH },
  epImgWrap: { position: 'relative' },
  epImg: {
    width: EPISODE_CARD_WIDTH,
    height: EPISODE_CARD_HEIGHT,
    borderRadius: radius.md,
    backgroundColor: colors.background.card,
  },
  epNumberBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  epNumberText: { fontFamily: 'Inter-Medium', fontSize: 9, color: '#fff' },
  epPlayBtn: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  epTitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    color: colors.text.primary,
    lineHeight: 15,
    marginTop: 6,
  },
  epDuration: {
    fontFamily: 'DMSans-Regular',
    fontSize: 10,
    color: colors.text.secondary,
    marginTop: 2,
  },
});
