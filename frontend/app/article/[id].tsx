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
import { colors, spacing, radius } from '../../constants/theme';
import { formatDate } from '../../constants/mockData';
import { Ionicons } from '@expo/vector-icons';

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => { loadArticle(); }, [id]);

  const loadArticle = async () => {
    try {
      const resp = await apiRequest(`/articles/${id}`, token);
      const data = await resp.json();
      setArticle(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleFavorite = async () => {
    if (!token) return;
    if (isFavorite) {
      await apiRequest(`/user/favorites/article/${id}`, token, { method: 'DELETE' });
      setIsFavorite(false);
    } else {
      await apiRequest('/user/favorites', token, {
        method: 'POST',
        body: JSON.stringify({ content_id: id, content_type: 'article' }),
      });
      setIsFavorite(true);
    }
  };

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={colors.brand.primary} /></View>;
  if (!article) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity testID="article-back-btn" style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerLabel}>Article</Text>
        <TouchableOpacity testID="article-favorite-btn" style={styles.backBtn} onPress={handleFavorite}>
          <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={22} color={isFavorite ? colors.brand.primary : colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <Image source={{ uri: article.thumbnail }} style={styles.heroImage} />

        <View style={styles.content}>
          {/* Meta */}
          <View style={styles.metaRow}>
            <Text style={styles.topic}>{article.topic}</Text>
            <Text style={styles.readingTime}>
              <Ionicons name="time-outline" size={12} color={colors.text.tertiary} /> {article.reading_time} min de lecture
            </Text>
          </View>

          <Text style={styles.title}>{article.title}</Text>

          {/* Author */}
          <TouchableOpacity
            testID="article-scholar-link"
            style={styles.authorRow}
            onPress={() => router.push(`/scholar/${article.scholar_id}` as any)}
          >
            <View style={styles.authorAvatar}>
              <Text style={styles.authorInitial}>{article.scholar_name?.[0] || 'S'}</Text>
            </View>
            <View>
              <Text style={styles.authorName}>{article.scholar_name}</Text>
              <Text style={styles.authorDate}>{formatDate(article.published_at)}</Text>
            </View>
          </TouchableOpacity>

          {/* Excerpt */}
          <View style={styles.excerptBox}>
            <Text style={styles.excerptText}>{article.excerpt}</Text>
          </View>

          {/* Full Content */}
          {article.content?.split('\n\n').map((paragraph: string, i: number) => (
            paragraph.trim() ? (
              <Text key={i} style={styles.paragraph}>{paragraph}</Text>
            ) : null
          ))}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },
  loading: { flex: 1, backgroundColor: colors.background.primary, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  headerLabel: { flex: 1, fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.text.secondary, textAlign: 'center' },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  heroImage: { width: '100%', height: 220, backgroundColor: colors.background.card },
  content: { padding: spacing.lg },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  topic: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: colors.brand.primary, textTransform: 'uppercase', letterSpacing: 0.8 },
  readingTime: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.text.tertiary },
  title: { fontFamily: 'Inter-Bold', fontSize: 24, color: colors.text.primary, lineHeight: 32, marginBottom: spacing.lg },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  authorAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brand.secondary, alignItems: 'center', justifyContent: 'center' },
  authorInitial: { fontFamily: 'Inter-Bold', fontSize: 16, color: '#000' },
  authorName: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.text.primary },
  authorDate: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.text.secondary },
  excerptBox: { backgroundColor: colors.background.card, borderLeftWidth: 3, borderLeftColor: colors.brand.primary, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.xl },
  excerptText: { fontFamily: 'Inter-Medium', fontSize: 15, color: colors.text.primary, lineHeight: 23, fontStyle: 'italic' },
  paragraph: { fontFamily: 'DMSans-Regular', fontSize: 16, color: colors.text.secondary, lineHeight: 26, marginBottom: spacing.lg },
});
