import React, { useEffect, useState, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, apiRequest } from '../../context/AuthContext';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { ContentCard } from '../../components/ContentCard';
import { colors, spacing, radius } from '../../constants/theme';
import { formatDuration } from '../../constants/mockData';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { user, token } = useAuth();
  const { play: playAudio } = useAudioPlayer();
  const router = useRouter();
  const [homeData, setHomeData] = useState<any>(null);
  const [featuredCourse, setFeaturedCourse] = useState<any>(null);
  const [recentCourses, setRecentCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHome = useCallback(async () => {
    try {
      // Fetch home data
      const homeResp = await apiRequest('/home', token);
      const homeJson = await homeResp.json();
      setHomeData(homeJson);

      // Fetch featured course
      try {
        const featuredResp = await apiRequest('/courses/featured', token);
        if (featuredResp.ok) {
          const featuredJson = await featuredResp.json();
          setFeaturedCourse(featuredJson);
        }
      } catch (e) {
        console.log('No featured course');
      }

      // Fetch recent courses
      try {
        const coursesResp = await apiRequest('/courses', token);
        const coursesJson = await coursesResp.json();
        // Sort by created_at desc and take first 6
        const sorted = coursesJson
          .filter((c: any) => c.is_active !== false)
          .sort((a: any, b: any) => {
            const dateA = new Date(a.created_at || 0);
            const dateB = new Date(b.created_at || 0);
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, 6);
        setRecentCourses(sorted);
      } catch (e) {
        console.log('Error fetching courses');
      }
    } catch (e) {
      console.error('Home fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchHome(); }, [fetchHome]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHome();
  };

  const navigateToContent = (item: any) => {
    if (item.type === 'course' || item.id?.startsWith('cours-') || item.id?.startsWith('crs-')) {
      router.push(`/course/${item.id}` as any);
    } else if (item.type === 'audio' || item.type === 'episode' || ['podcast', 'lecture', 'quran', 'documentary'].includes(item.type)) {
      router.push(`/audio/${item.id}` as any);
    } else if (item.type === 'article') {
      router.push(`/article/${item.id}` as any);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    );
  }

  const hero = homeData?.hero;
  const recommendations = homeData?.recommendations || [];
  const scholars = homeData?.scholars || [];
  const greeting = new Date().getHours() < 12 ? 'Bonjour' : new Date().getHours() < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <View style={styles.logoRow}>
              <Text style={styles.logoMain}>Sijill</Text>
              <Text style={styles.logoByLM}></Text>
            </View>
          </View>
          <TouchableOpacity testID="home-profile-btn" onPress={() => router.push('/(tabs)/profil')}>
            <Image
              source={{ uri: user?.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=04D182&color=000&bold=true` }}
              style={styles.avatar}
            />
          </TouchableOpacity>
        </View>

        {/* Featured Course - Highlight */}
        {featuredCourse && (
          <TouchableOpacity
            testID="home-featured-course"
            style={styles.featuredCard}
            onPress={() => navigateToContent({ id: featuredCourse.id, type: 'course' })}
          >
            <Image source={{ uri: featuredCourse.thumbnail || 'https://via.placeholder.com/400x250' }} style={styles.featuredImage} />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.95)']}
              style={styles.featuredGradient}
            >
              <View style={styles.featuredBadge}>
                <Ionicons name="star" size={12} color="#000" />
                <Text style={styles.featuredBadgeText}>À LA UNE</Text>
              </View>
              <Text style={styles.featuredTitle} numberOfLines={2}>{featuredCourse.title}</Text>
              <Text style={styles.featuredScholar}>{featuredCourse.scholar_name}</Text>
              <View style={styles.featuredMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="book-outline" size={12} color={colors.text.secondary} />
                  <Text style={styles.metaText}>{featuredCourse.modules_count || 0} modules</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={12} color={colors.text.secondary} />
                  <Text style={styles.metaText}>{formatDuration(featuredCourse.duration)}</Text>
                </View>
                <View style={[styles.levelBadge, { borderColor: getLevelColor(featuredCourse.level) }]}>
                  <Text style={[styles.levelText, { color: getLevelColor(featuredCourse.level) }]}>{featuredCourse.level}</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Continue Learning - Last watched */}
        {hero && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Reprendre votre lecture</Text>
            </View>
            <TouchableOpacity
              testID="home-continue-learning"
              style={styles.continueCard}
              onPress={() => navigateToContent(hero.content)}
            >
              <Image source={{ uri: hero.content.thumbnail }} style={styles.continueImage} />
              <View style={styles.continueInfo}>
                <Text style={styles.continueTitle} numberOfLines={2}>{hero.content.title}</Text>
                <Text style={styles.continueScholar}>{hero.content.scholar_name}</Text>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${(hero.progress || 0) * 100}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{Math.round((hero.progress || 0) * 100)}%</Text>
                </View>
              </View>
              <View style={styles.playButton}>
                <Ionicons name="play" size={16} color="#000" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recommandé pour vous</Text>
              <TouchableOpacity testID="home-see-all-recommendations" onPress={() => router.push('/(tabs)/cursus')}>
                <Text style={styles.seeAll}>Voir tout</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {recommendations.map((item: any) => (
                <ContentCard
                  key={item.id}
                  item={item}
                  onPress={() => navigateToContent(item)}
                  size="medium"
                  testID={`home-rec-${item.id}`}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Scholars */}
        {scholars.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Professeurs</Text>
              <TouchableOpacity testID="home-see-all-scholars" onPress={() => router.push('/(tabs)/explorer' as any)}>
                <Text style={styles.seeAll}>Voir tout</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {scholars.map((scholar: any) => (
                <TouchableOpacity
                  key={scholar.id}
                  testID={`home-scholar-${scholar.id}`}
                  style={styles.scholarCard}
                  onPress={() => router.push(`/scholar/${scholar.id}` as any)}
                >
                  <Image
                    source={{ uri: scholar.photo_url || scholar.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(scholar.name || 'S')}&background=04D182&color=000&bold=true&size=128` }}
                    style={styles.scholarAvatar}
                  />
                  <Text style={styles.scholarName} numberOfLines={2}>{scholar.name}</Text>
                  {scholar.speciality && (
                    <Text style={styles.scholarSpeciality} numberOfLines={1}>{scholar.speciality}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Recent Courses */}
        {recentCourses.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Derniers cours publiés</Text>
              <TouchableOpacity testID="home-see-all-courses" onPress={() => router.push('/(tabs)/cursus')}>
                <Text style={styles.seeAll}>Voir tout</Text>
              </TouchableOpacity>
            </View>
            {recentCourses.map((course: any) => (
              <TouchableOpacity
                key={course.id}
                testID={`home-recent-${course.id}`}
                style={styles.courseRow}
                onPress={() => navigateToContent({ id: course.id, type: 'course' })}
              >
                <Image source={{ uri: course.thumbnail || 'https://via.placeholder.com/80x80' }} style={styles.courseThumb} />
                <View style={styles.courseInfo}>
                  <Text style={styles.courseTopic}>{course.topic || 'Philosophie'}</Text>
                  <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
                  <Text style={styles.courseMeta}>{course.scholar_name} · {course.modules_count || 0} modules</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },
  scroll: { flex: 1 },
  loadingContainer: { flex: 1, backgroundColor: colors.background.primary, alignItems: 'center', justifyContent: 'center' },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  greeting: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.text.secondary },
  logoRow: { flexDirection: 'row', alignItems: 'baseline' },
  logoMain: { fontFamily: 'Inter-Bold', fontSize: 28, color: colors.text.primary, letterSpacing: -0.5 },
  logoByLM: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.brand.primary, marginLeft: 3 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.background.card, borderWidth: 2, borderColor: colors.brand.primary },
  
  // Featured Course
  featuredCard: { marginHorizontal: spacing.lg, borderRadius: radius.xl, overflow: 'hidden', height: 260, marginBottom: spacing.xl },
  featuredImage: { width: '100%', height: '100%', position: 'absolute' },
  featuredGradient: { flex: 1, justifyContent: 'flex-end', padding: spacing.lg },
  featuredBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: colors.brand.primary, 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: radius.full, 
    alignSelf: 'flex-start', 
    marginBottom: spacing.sm 
  },
  featuredBadgeText: { fontFamily: 'Inter-Bold', fontSize: 10, color: '#000', letterSpacing: 0.5 },
  featuredTitle: { fontFamily: 'Inter-Bold', fontSize: 22, color: colors.text.primary, marginBottom: 4, lineHeight: 28 },
  featuredScholar: { fontFamily: 'DMSans-Medium', fontSize: 14, color: colors.brand.primary, marginBottom: spacing.md },
  featuredMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.text.secondary },
  levelBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.sm },
  levelText: { fontFamily: 'Inter-Medium', fontSize: 10 },

  // Continue Learning
  continueCard: { 
    marginHorizontal: spacing.lg, 
    backgroundColor: colors.background.card, 
    borderRadius: radius.lg, 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: spacing.md, 
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(217, 255, 0, 0.2)',
  },
  continueImage: { width: 80, height: 80, borderRadius: radius.md, backgroundColor: colors.background.elevated },
  continueInfo: { flex: 1 },
  continueTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.text.primary, marginBottom: 3, lineHeight: 19 },
  continueScholar: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.text.secondary, marginBottom: spacing.sm },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressBar: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: colors.brand.primary, borderRadius: 2 },
  progressText: { fontFamily: 'Inter-Medium', fontSize: 11, color: colors.brand.primary },
  playButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center' },

  // Sections
  section: { marginBottom: spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  sectionTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: colors.text.primary },
  seeAll: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.brand.primary },
  horizontalList: { paddingHorizontal: spacing.lg, paddingRight: spacing.sm, gap: spacing.md },

  // Course Row
  courseRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: spacing.lg, 
    paddingVertical: spacing.md, 
    gap: spacing.md, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.border.subtle 
  },
  courseThumb: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.background.card },
  courseInfo: { flex: 1 },
  courseTopic: { fontFamily: 'Inter-Medium', fontSize: 10, color: colors.brand.primary, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  courseTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.text.primary, lineHeight: 19, marginBottom: 3 },

  // Scholar Cards
  scholarCard: {
    alignItems: 'center',
    width: 90,
    gap: 8,
  },
  scholarAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.background.card,
    borderWidth: 2,
    borderColor: 'rgba(4,209,130,0.3)',
  },
  scholarName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 16,
  },
  scholarSpeciality: {
    fontFamily: 'DMSans-Regular',
    fontSize: 10,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  courseMeta: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.text.secondary },
});
