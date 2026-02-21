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
import { formatCourseDuration, getLevelColor } from '../../constants/mockData';
import { Ionicons } from '@expo/vector-icons';
import { useAccessCheck } from '../../hooks/useAccessCheck';
import { PaywallOverlay } from '../../components/PaywallOverlay';

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Check if user has access to this course
  const { hasAccess, reason, loading: accessLoading } = useAccessCheck('course', id);

  useEffect(() => {
    loadCourse();
  }, [id]);

  const loadCourse = async () => {
    try {
      const resp = await apiRequest(`/courses/${id}`, token);
      const data = await resp.json();
      setCourse(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

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

  if (loading || accessLoading) return <View style={styles.loading}><ActivityIndicator size="large" color={colors.brand.primary} /></View>;
  if (!course) return null;

  // All modules are locked if user doesn't have access
  const SAMPLE_MODULES = Array.from({ length: course.modules_count || 5 }, (_, i) => ({
    id: i + 1,
    title: `Module ${i + 1}`,
    duration: Math.floor(Math.random() * 30) + 20,
    isLocked: !hasAccess || i > 0, // Only first module is preview if no access
    isPreview: !hasAccess && i === 0,
  }));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Image source={{ uri: course.thumbnail }} style={styles.heroImage} />
          <LinearGradient colors={['transparent', '#121212']} style={styles.heroGradient}>
            <TouchableOpacity testID="course-back-btn" style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <View style={styles.content}>
          {/* Metadata */}
          <View style={styles.metaRow}>
            <View style={[styles.levelBadge, { borderColor: getLevelColor(course.level) }]}>
              <Text style={[styles.levelText, { color: getLevelColor(course.level) }]}>{course.level}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={colors.text.secondary} />
              <Text style={styles.metaText}>{formatCourseDuration(course.duration)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="list-outline" size={14} color={colors.text.secondary} />
              <Text style={styles.metaText}>{course.modules_count} modules</Text>
            </View>
          </View>

          <Text style={styles.title}>{course.title}</Text>

          {/* Scholar */}
          <TouchableOpacity
            testID="course-scholar-btn"
            style={styles.scholarRow}
            onPress={() => router.push(`/scholar/${course.scholar_id}` as any)}
          >
            <View style={styles.scholarAvatar}>
              <Text style={styles.scholarInitial}>{course.scholar_name?.[0] || 'S'}</Text>
            </View>
            <View>
              <Text style={styles.scholarLabel}>Enseignant</Text>
              <Text style={styles.scholarName}>{course.scholar_name}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          {/* CTA */}
          {hasAccess ? (
            <TouchableOpacity
              testID="course-start-btn"
              style={styles.startBtn}
              onPress={() => {}}
            >
              <Ionicons name="play" size={18} color="#000" />
              <Text style={styles.startBtnText}>Commencer le cours</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              testID="course-subscribe-btn"
              style={styles.startBtn}
              onPress={() => router.push('/subscription-choice' as any)}
            >
              <Ionicons name="lock-closed" size={18} color="#000" />
              <Text style={styles.startBtnText}>S'abonner pour accéder</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            testID="course-favorite-btn"
            style={[styles.favoriteBtn, isFavorite && styles.favoriteBtnActive]}
            onPress={handleFavorite}
          >
            <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={18} color={isFavorite ? '#000' : colors.brand.primary} />
            <Text style={[styles.favoriteBtnText, isFavorite && { color: '#000' }]}>
              {isFavorite ? 'Sauvegardé' : 'Sauvegarder'}
            </Text>
          </TouchableOpacity>

          {/* About */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>À propos de ce cours</Text>
            <Text style={styles.descText}>{course.description}</Text>
          </View>

          {/* Tags */}
          {course.tags?.length > 0 && (
            <View style={styles.tagsRow}>
              {course.tags.map((tag: string) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Modules */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Programme ({course.modules_count} modules)</Text>
            {!hasAccess && (
              <View style={styles.accessWarning}>
                <Ionicons name="information-circle" size={16} color={colors.brand.primary} />
                <Text style={styles.accessWarningText}>
                  Abonnez-vous pour accéder à l'intégralité du cours
                </Text>
              </View>
            )}
            {SAMPLE_MODULES.map((mod) => (
              <View key={mod.id} testID={`course-module-${mod.id}`} style={styles.moduleRow}>
                <View style={[styles.moduleIcon, mod.isLocked && styles.moduleIconLocked]}>
                  <Ionicons
                    name={mod.isLocked ? 'lock-closed' : 'play'}
                    size={14}
                    color={mod.isLocked ? colors.text.tertiary : '#000'}
                  />
                </View>
                <View style={styles.moduleInfo}>
                  <Text style={[styles.moduleTitle, mod.isLocked && styles.moduleTitleLocked]}>
                    {mod.id}. {mod.title}
                  </Text>
                  <Text style={styles.moduleDuration}>{mod.duration} min</Text>
                </View>
                {mod.isPreview && (
                  <View style={styles.freeBadge}>
                    <Text style={styles.freeBadgeText}>Aperçu gratuit</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },
  scroll: { flex: 1 },
  loading: { flex: 1, backgroundColor: colors.background.primary, alignItems: 'center', justifyContent: 'center' },
  hero: { height: 280, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroGradient: { position: 'absolute', inset: 0, justifyContent: 'flex-start', padding: spacing.lg },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  content: { padding: spacing.lg },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md, flexWrap: 'wrap' },
  levelBadge: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  levelText: { fontFamily: 'Inter-SemiBold', fontSize: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.text.secondary },
  title: { fontFamily: 'Inter-Bold', fontSize: 22, color: colors.text.primary, lineHeight: 30, marginBottom: spacing.lg },
  scholarRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background.card, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md, marginBottom: spacing.lg },
  scholarAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  scholarInitial: { fontFamily: 'Inter-Bold', fontSize: 18, color: '#000' },
  scholarLabel: { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.text.secondary },
  scholarName: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.text.primary },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.brand.primary, borderRadius: radius.full, padding: 16, marginBottom: spacing.sm },
  startBtnText: { fontFamily: 'Inter-Bold', fontSize: 16, color: '#000' },
  favoriteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.brand.primary, borderRadius: radius.full, padding: 14, marginBottom: spacing.xl },
  favoriteBtnActive: { backgroundColor: colors.brand.primary },
  favoriteBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.brand.primary },
  section: { marginBottom: spacing.xl },
  sectionTitle: { fontFamily: 'Inter-Bold', fontSize: 17, color: colors.text.primary, marginBottom: spacing.md },
  descText: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.text.secondary, lineHeight: 22 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  tag: { backgroundColor: colors.background.card, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  tagText: { fontFamily: 'Inter-Medium', fontSize: 12, color: colors.text.secondary },
  moduleRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border.subtle, gap: spacing.md },
  moduleIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  moduleIconLocked: { backgroundColor: colors.background.card },
  moduleInfo: { flex: 1 },
  moduleTitle: { fontFamily: 'Inter-Medium', fontSize: 14, color: colors.text.primary, marginBottom: 2 },
  moduleTitleLocked: { color: colors.text.secondary },
  moduleDuration: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.text.tertiary },
  freeBadge: { backgroundColor: 'rgba(4,209,130,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  freeBadgeText: { fontFamily: 'Inter-Medium', fontSize: 9, color: colors.brand.primary },
});
