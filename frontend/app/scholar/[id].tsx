import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { apiRequest, useAuth } from '../../context/AuthContext';
import { ContentCard } from '../../components/ContentCard';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { colors, spacing, radius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function ScholarDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { play } = useAudioPlayer();
  const [scholar, setScholar] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [audios, setAudios] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadScholar(); }, [id]);

  const loadScholar = async () => {
    try {
      const [schResp, coursesResp, audiosResp, articlesResp] = await Promise.all([
        apiRequest(`/scholars/${id}`, token),
        apiRequest(`/courses?scholar_id=${id}`, token),
        apiRequest(`/audios?scholar_id=${id}`, token),
        apiRequest(`/articles`, token),
      ]);
      const schData = await schResp.json();
      const coursesData = await coursesResp.json();
      const audiosData = await audiosResp.json();
      const articlesData = await articlesResp.json();
      setScholar(schData);
      setCourses(coursesData);
      setAudios(audiosData);
      setArticles(articlesData.filter((a: any) => a.scholar_id === id));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const navigateContent = (item: any) => {
    if (item.type === 'course') router.push(`/course/${item.id}` as any);
    else if (['podcast', 'lecture', 'quran', 'documentary'].includes(item.type)) router.push(`/audio/${item.id}` as any);
    else if (item.type === 'article') router.push(`/article/${item.id}` as any);
  };

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={colors.brand.primary} /></View>;
  if (!scholar) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Image source={{ uri: scholar.photo }} style={styles.heroImage} />
          <LinearGradient colors={['rgba(0,0,0,0.4)', '#121212']} style={styles.heroGradient}>
            <TouchableOpacity testID="scholar-back-btn" style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
            </TouchableOpacity>
            <View style={styles.heroInfo}>
              <Text style={styles.name}>{scholar.name}</Text>
              <Text style={styles.university}>{scholar.university}</Text>
              <View style={styles.specs}>
                {scholar.specializations?.map((spec: string) => (
                  <View key={spec} style={styles.specChip}>
                    <Text style={styles.specText}>{spec}</Text>
                  </View>
                ))}
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.content}>
          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{courses.length}</Text>
              <Text style={styles.statLabel}>Cours</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{audios.length}</Text>
              <Text style={styles.statLabel}>Audios</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{articles.length}</Text>
              <Text style={styles.statLabel}>Articles</Text>
            </View>
          </View>

          {/* Bio */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Biographie</Text>
            <Text style={styles.bioText}>{scholar.bio}</Text>
          </View>

          {/* Courses */}
          {courses.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cours</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {courses.map((item: any) => (
                  <ContentCard key={item.id} item={item} onPress={() => navigateContent(item)} testID={`scholar-course-${item.id}`} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Audios */}
          {audios.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Podcasts & Conférences</Text>
              {audios.map((item: any) => (
                <TouchableOpacity
                  key={item.id}
                  testID={`scholar-audio-${item.id}`}
                  style={styles.audioRow}
                  onPress={() => router.push(`/audio/${item.id}` as any)}
                >
                  <Image source={{ uri: item.thumbnail }} style={styles.audioThumb} />
                  <View style={styles.audioInfo}>
                    <Text style={styles.audioTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.audioType}>{item.type}</Text>
                  </View>
                  <Ionicons name="play-circle" size={28} color={colors.brand.primary} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Articles */}
          {articles.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Articles</Text>
              {articles.map((item: any) => (
                <TouchableOpacity
                  key={item.id}
                  testID={`scholar-article-${item.id}`}
                  style={styles.audioRow}
                  onPress={() => router.push(`/article/${item.id}` as any)}
                >
                  <Image source={{ uri: item.thumbnail }} style={styles.audioThumb} />
                  <View style={styles.audioInfo}>
                    <Text style={styles.audioTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.audioType}>{item.reading_time} min de lecture</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
                </TouchableOpacity>
              ))}
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
  loading: { flex: 1, backgroundColor: colors.background.primary, alignItems: 'center', justifyContent: 'center' },
  hero: { height: 320, position: 'relative' },
  heroImage: { width: '100%', height: '100%', position: 'absolute' },
  heroGradient: { flex: 1, justifyContent: 'space-between', padding: spacing.lg, paddingTop: spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  heroInfo: { },
  name: { fontFamily: 'Inter-Bold', fontSize: 24, color: colors.text.primary, marginBottom: 4 },
  university: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.brand.secondary, marginBottom: 10 },
  specs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  specChip: { backgroundColor: 'rgba(4,209,130,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  specText: { fontFamily: 'Inter-Medium', fontSize: 11, color: colors.brand.primary },
  content: { padding: spacing.lg },
  statsRow: { flexDirection: 'row', backgroundColor: colors.background.card, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.xl, alignItems: 'center' },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: 'Inter-Bold', fontSize: 22, color: colors.brand.primary, marginBottom: 3 },
  statLabel: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.text.secondary },
  statDivider: { width: 1, height: 36, backgroundColor: colors.border.default },
  section: { marginBottom: spacing.xl },
  sectionTitle: { fontFamily: 'Inter-Bold', fontSize: 17, color: colors.text.primary, marginBottom: spacing.md },
  bioText: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.text.secondary, lineHeight: 22 },
  audioRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border.subtle, gap: spacing.md },
  audioThumb: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.background.card },
  audioInfo: { flex: 1 },
  audioTitle: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.text.primary, lineHeight: 18, marginBottom: 3 },
  audioType: { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.text.secondary },
});
