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
import { ContentCard, ScholarCard } from '../../components/ContentCard';
import { colors, spacing, radius, typography } from '../../constants/theme';
import { formatDuration, formatDate } from '../../constants/mockData';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { user, token } = useAuth();
  const { play: playAudio } = useAudioPlayer();
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

  const onRefresh = () => {
    setRefreshing(true);
    fetchHome();
  };

  const handlePlayAudio = (audio: any) => {
    playTrack({
      id: audio.id,
      title: audio.title,
      scholar_name: audio.scholar_name,
      thumbnail: audio.thumbnail,
      audio_url: audio.audio_url,
      type: audio.type,
      duration: audio.duration,
    });
  };

  const navigateToContent = (item: any) => {
    if (item.type === 'course') {
      router.push(`/course/${item.id}` as any);
    } else if (['podcast', 'lecture', 'quran', 'documentary'].includes(item.type)) {
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
  const featuredScholar = homeData?.featured_scholar;
  const dailyPick = homeData?.daily_pick;
  const recentPublications = homeData?.recent_publications || [];
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
              <Text style={styles.logoHikma}>Hikma</Text>
              <Text style={styles.logoByLM}>by LM</Text>
            </View>
          </View>
          <TouchableOpacity testID="home-profile-btn" onPress={() => router.push('/(tabs)/profil')}>
            <Image
              source={{ uri: user?.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=04D182&color=000&bold=true` }}
              style={styles.avatar}
            />
          </TouchableOpacity>
        </View>

        {/* Hero - Continue Learning */}
        {hero && (
          <TouchableOpacity
            testID="home-hero-card"
            style={styles.heroCard}
            onPress={() => navigateToContent(hero.content)}
          >
            <Image source={{ uri: hero.content.thumbnail }} style={styles.heroImage} />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.85)']}
              style={styles.heroGradient}
            >
              <View style={styles.heroTag}>
                <Text style={styles.heroTagText}>CONTINUER L'APPRENTISSAGE</Text>
              </View>
              <Text style={styles.heroTitle} numberOfLines={2}>{hero.content.title}</Text>
              <Text style={styles.heroScholar}>{hero.content.scholar_name}</Text>
              <View style={styles.heroBottom}>
                <View style={styles.heroProgressBar}>
                  <View style={[styles.heroProgressFill, { width: `${(hero.progress || 0) * 100}%` }]} />
                </View>
                <Text style={styles.heroProgressText}>{Math.round((hero.progress || 0) * 100)}%</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Recommendations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recommandé pour vous</Text>
            <TouchableOpacity testID="home-see-all-recommendations" onPress={() => router.push('/(tabs)/explorer')}>
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

        {/* Featured Scholar */}
        {featuredScholar && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Érudit de la semaine</Text>
            <TouchableOpacity
              testID="home-featured-scholar"
              style={styles.featuredScholarCard}
              onPress={() => router.push(`/scholar/${featuredScholar.id}` as any)}
            >
              <Image source={{ uri: featuredScholar.photo }} style={styles.scholarBg} />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.scholarGradient}>
                <View style={styles.scholarWeekBadge}>
                  <Ionicons name="star" size={10} color={colors.brand.primary} />
                  <Text style={styles.scholarWeekText}>ÉRUDIT DE LA SEMAINE</Text>
                </View>
                <Text style={styles.scholarFeaturedName}>{featuredScholar.name}</Text>
                <Text style={styles.scholarFeaturedUni}>{featuredScholar.university}</Text>
                <Text style={styles.scholarFeaturedBio} numberOfLines={2}>{featuredScholar.bio}</Text>
                <View style={styles.scholarTags}>
                  {featuredScholar.specializations?.slice(0, 2).map((s: string) => (
                    <View key={s} style={styles.specChip}>
                      <Text style={styles.specChipText}>{s}</Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Daily Pick */}
        {dailyPick && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Écoute du jour</Text>
            <TouchableOpacity
              testID="home-daily-pick"
              style={styles.dailyPickCard}
              onPress={() => handlePlayAudio(dailyPick)}
            >
              <Image source={{ uri: dailyPick.thumbnail }} style={styles.dailyPickImage} />
              <View style={styles.dailyPickInfo}>
                <View style={styles.dailyPickBadge}>
                  <Ionicons name="musical-note" size={10} color={colors.brand.secondary} />
                  <Text style={styles.dailyPickBadgeText}>
                    {dailyPick.type === 'quran' ? 'RÉCITATION' : dailyPick.type === 'podcast' ? 'PODCAST' : 'CONFÉRENCE'}
                  </Text>
                </View>
                <Text style={styles.dailyPickTitle} numberOfLines={2}>{dailyPick.title}</Text>
                <Text style={styles.dailyPickScholar}>{dailyPick.scholar_name}</Text>
                <Text style={styles.dailyPickDuration}>{formatDuration(dailyPick.duration)}</Text>
              </View>
              <View style={styles.dailyPickPlay}>
                <Ionicons name="play" size={18} color="#000" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Recent Publications */}
        {recentPublications.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Publications récentes</Text>
              <TouchableOpacity testID="home-see-all-articles" onPress={() => router.push('/(tabs)/explorer')}>
                <Text style={styles.seeAll}>Voir tout</Text>
              </TouchableOpacity>
            </View>
            {recentPublications.map((article: any) => (
              <TouchableOpacity
                key={article.id}
                testID={`home-article-${article.id}`}
                style={styles.articleRow}
                onPress={() => router.push(`/article/${article.id}` as any)}
              >
                <Image source={{ uri: article.thumbnail }} style={styles.articleThumb} />
                <View style={styles.articleInfo}>
                  <Text style={styles.articleTopic}>{article.topic}</Text>
                  <Text style={styles.articleTitle} numberOfLines={2}>{article.title}</Text>
                  <Text style={styles.articleMeta}>{article.scholar_name} · {article.reading_time} min</Text>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },
  scroll: { flex: 1 },
  loadingContainer: { flex: 1, backgroundColor: colors.background.primary, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  greeting: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.text.secondary },
  logoRow: { flexDirection: 'row', alignItems: 'baseline' },
  logoHikma: { fontFamily: 'Inter-Bold', fontSize: 28, color: colors.text.primary, letterSpacing: -0.5 },
  logoByLM: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.brand.primary, marginLeft: 3 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.background.card, borderWidth: 2, borderColor: colors.brand.primary },
  // Hero
  heroCard: { marginHorizontal: spacing.lg, borderRadius: radius.lg, overflow: 'hidden', height: 220, marginBottom: spacing.lg },
  heroImage: { width: '100%', height: '100%', position: 'absolute' },
  heroGradient: { flex: 1, justifyContent: 'flex-end', padding: spacing.md },
  heroTag: { backgroundColor: 'rgba(4, 209, 130, 0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm, alignSelf: 'flex-start', marginBottom: 6 },
  heroTagText: { fontFamily: 'Inter-SemiBold', fontSize: 9, color: colors.brand.primary, letterSpacing: 1 },
  heroTitle: { fontFamily: 'Inter-Bold', fontSize: 17, color: colors.text.primary, marginBottom: 3, lineHeight: 22 },
  heroScholar: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.text.secondary, marginBottom: 10 },
  heroBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroProgressBar: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 1.5 },
  heroProgressFill: { height: 3, backgroundColor: colors.brand.primary, borderRadius: 1.5 },
  heroProgressText: { fontFamily: 'Inter-Medium', fontSize: 11, color: colors.brand.primary },
  // Sections
  section: { marginBottom: spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  sectionTitle: { fontFamily: 'Inter-Bold', fontSize: 17, color: colors.text.primary, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  seeAll: { fontFamily: 'Inter-Medium', fontSize: 12, color: colors.brand.primary },
  horizontalList: { paddingHorizontal: spacing.lg, paddingRight: spacing.sm },
  // Featured Scholar
  featuredScholarCard: { marginHorizontal: spacing.lg, height: 200, borderRadius: radius.lg, overflow: 'hidden' },
  scholarBg: { width: '100%', height: '100%', position: 'absolute' },
  scholarGradient: { flex: 1, justifyContent: 'flex-end', padding: spacing.md },
  scholarWeekBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  scholarWeekText: { fontFamily: 'Inter-SemiBold', fontSize: 9, color: colors.brand.primary, letterSpacing: 1 },
  scholarFeaturedName: { fontFamily: 'Inter-Bold', fontSize: 18, color: colors.text.primary, marginBottom: 2 },
  scholarFeaturedUni: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.brand.secondary, marginBottom: 6 },
  scholarFeaturedBio: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.text.secondary, lineHeight: 17, marginBottom: 8 },
  scholarTags: { flexDirection: 'row', gap: 6 },
  specChip: { backgroundColor: 'rgba(4, 209, 130, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 3 },
  specChipText: { fontFamily: 'Inter-Medium', fontSize: 10, color: colors.brand.primary },
  // Daily Pick
  dailyPickCard: { marginHorizontal: spacing.lg, backgroundColor: colors.background.card, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md },
  dailyPickImage: { width: 70, height: 70, borderRadius: radius.md, backgroundColor: colors.background.elevated },
  dailyPickInfo: { flex: 1 },
  dailyPickBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  dailyPickBadgeText: { fontFamily: 'Inter-Medium', fontSize: 9, color: colors.brand.secondary, letterSpacing: 0.8 },
  dailyPickTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.text.primary, marginBottom: 3, lineHeight: 19 },
  dailyPickScholar: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.text.secondary, marginBottom: 3 },
  dailyPickDuration: { fontFamily: 'Inter-Medium', fontSize: 11, color: colors.text.tertiary },
  dailyPickPlay: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  // Articles
  articleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  articleThumb: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.background.card },
  articleInfo: { flex: 1 },
  articleTopic: { fontFamily: 'Inter-Medium', fontSize: 10, color: colors.brand.primary, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  articleTitle: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.text.primary, lineHeight: 18, marginBottom: 3 },
  articleMeta: { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.text.secondary },
});
