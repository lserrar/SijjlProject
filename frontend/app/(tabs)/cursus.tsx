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

interface Thematique {
  id: string;
  name: string;
  order: number;
  icon: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  scholar_name: string;
  modules_count: number;
  thumbnail: string;
  thematique_id: string;
}

export default function CursusScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [thematiques, setThematiques] = useState<Thematique[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedTheme, setExpandedTheme] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [themRes, coursesRes] = await Promise.all([
        apiRequest('/thematiques', token),
        apiRequest('/courses', token),
      ]);
      
      if (themRes.ok) {
        const data = await themRes.json();
        setThematiques(data.sort((a: Thematique, b: Thematique) => a.order - b.order));
      }
      if (coursesRes.ok) {
        const data = await coursesRes.json();
        setCourses(data);
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

  const toggleTheme = (themeId: string) => {
    setExpandedTheme(expandedTheme === themeId ? null : themeId);
  };

  const getCoursesByTheme = (themeId: string) => {
    return courses.filter(c => c.thematique_id === themeId);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
          <Text style={styles.loadingText}>Chargement des cursus...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.brand.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Nos Cursus</Text>
          <Text style={styles.headerSubtitle}>
            Explorez les 20 thématiques de la pensée islamique
          </Text>
        </View>

        {/* Thematiques List */}
        <View style={styles.themesList}>
          {thematiques.map((theme, index) => {
            const themeCourses = getCoursesByTheme(theme.id);
            const isExpanded = expandedTheme === theme.id;

            return (
              <View key={theme.id} style={styles.themeContainer}>
                <TouchableOpacity
                  style={[
                    styles.themeCard,
                    isExpanded && styles.themeCardExpanded,
                  ]}
                  onPress={() => toggleTheme(theme.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.themeNumber}>
                    <Text style={styles.themeNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.themeInfo}>
                    <Text style={styles.themeName}>{theme.name}</Text>
                    <Text style={styles.themeCourseCount}>
                      {themeCourses.length} cours
                    </Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.text.secondary}
                  />
                </TouchableOpacity>

                {/* Expanded Courses */}
                {isExpanded && (
                  <View style={styles.coursesContainer}>
                    {themeCourses.length === 0 ? (
                      <Text style={styles.noCourses}>Cours à venir</Text>
                    ) : (
                      themeCourses.map(course => (
                        <TouchableOpacity
                          key={course.id}
                          style={styles.courseCard}
                          onPress={() => router.push(`/course/${course.id}`)}
                        >
                          <Image
                            source={{ uri: course.thumbnail }}
                            style={styles.courseThumbnail}
                          />
                          <View style={styles.courseInfo}>
                            <Text style={styles.courseTitle} numberOfLines={2}>
                              {course.title}
                            </Text>
                            <Text style={styles.courseScholar}>
                              {course.scholar_name}
                            </Text>
                            <Text style={styles.courseModules}>
                              {course.modules_count} épisode{course.modules_count > 1 ? 's' : ''}
                            </Text>
                          </View>
                          <Ionicons
                            name="play-circle"
                            size={28}
                            color={colors.brand.primary}
                          />
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })}
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
  themesList: {
    paddingHorizontal: spacing.md,
  },
  themeContainer: {
    marginBottom: spacing.sm,
  },
  themeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  themeCardExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  themeNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brand.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeNumberText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: colors.brand.primary,
  },
  themeInfo: {
    flex: 1,
  },
  themeName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: 2,
  },
  themeCourseCount: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: colors.text.secondary,
  },
  coursesContainer: {
    backgroundColor: colors.background.elevated,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    padding: spacing.sm,
  },
  noCourses: {
    fontFamily: 'DMSans-Italic',
    fontSize: 13,
    color: colors.text.tertiary,
    textAlign: 'center',
    padding: spacing.md,
  },
  courseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  courseThumbnail: {
    width: 50,
    height: 50,
    borderRadius: radius.sm,
    backgroundColor: colors.background.elevated,
  },
  courseInfo: {
    flex: 1,
  },
  courseTitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: colors.text.primary,
    marginBottom: 2,
  },
  courseScholar: {
    fontFamily: 'DMSans-Regular',
    fontSize: 11,
    color: colors.brand.primary,
  },
  courseModules: {
    fontFamily: 'DMSans-Regular',
    fontSize: 10,
    color: colors.text.tertiary,
  },
});
