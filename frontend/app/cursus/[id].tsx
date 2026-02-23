import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth, apiRequest } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const CURSUS_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const CURSUS_COLORS = ['#04D182', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4', '#C9A84C'];

function fmtDur(s: number) {
  if (!s) return '';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m > 0 ? m + 'min' : ''}`.trim();
  return `${m} min`;
}

export default function CursusDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const [cursus, setCursus] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cursusColor = cursus
    ? CURSUS_COLORS[Math.max(0, Math.min((cursus.order || 1) - 1, CURSUS_COLORS.length - 1))]
    : '#04D182';
  const cursusLetter = cursus
    ? CURSUS_LETTERS[Math.max(0, Math.min((cursus.order || 1) - 1, CURSUS_LETTERS.length - 1))]
    : 'A';

  const loadData = useCallback(async () => {
    try {
      const [allCursusRes, coursesRes] = await Promise.all([
        apiRequest('/cursus', token),
        apiRequest(`/courses?thematique_id=${id}`, token),
      ]);
      if (allCursusRes.ok) {
        const all = await allCursusRes.json();
        const found = all.find((c: any) => c.id === id);
        setCursus(found || null);
      }
      if (coursesRes.ok) {
        const data = await coursesRes.json();
        setCourses(data.filter ? data.filter((c: any) => c.thematique_id === id || c.cursus_id === id) : data);
      }
    } catch (e) {
      console.error('Load cursus detail error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, token]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = () => { setRefreshing(true); loadData(); };

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="large" color="#04D182" />
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Top Nav */}
      <SafeAreaView edges={['top']} style={s.navWrap}>
        <View style={s.nav}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={18} color="#F5F0E8" strokeWidth={2} />
            <Text style={s.backLabel}>Cursus</Text>
          </TouchableOpacity>
          <View style={{ width: 18 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#04D182" />}
      >
        {/* Header */}
        <View style={s.header}>
          {/* Colored bar */}
          <View style={[s.cursusBar, { backgroundColor: cursusColor }]} />

          <View style={s.headerContent}>
            {/* Badge */}
            <View style={s.badge}>
              <View style={[s.badgeDot, { backgroundColor: cursusColor, shadowColor: cursusColor }]} />
              <Text style={[s.badgeText, { color: cursusColor }]}>
                CURSUS {cursusLetter}
              </Text>
            </View>

            {/* Letter display */}
            <Text style={[s.cursusLetter, { color: cursusColor + '22' }]}>{cursusLetter}</Text>

            {/* Name */}
            <Text style={s.cursusName}>{cursus?.name || `Cursus ${cursusLetter}`}</Text>

            {/* Description */}
            {cursus?.description ? (
              <Text style={s.cursusDesc}>{cursus.description}</Text>
            ) : null}

            {/* Stats */}
            <View style={s.statsRow}>
              <View style={s.statItem}>
                <Text style={[s.statValue, { color: cursusColor }]}>{courses.length}</Text>
                <Text style={s.statLabel}>COURS</Text>
              </View>
              <View style={[s.statDivider, { backgroundColor: '#222' }]} />
              <View style={s.statItem}>
                <Text style={[s.statValue, { color: cursusColor }]}>
                  {courses.reduce((acc, c) => acc + (c.modules_count || 0), 0)}
                </Text>
                <Text style={s.statLabel}>ÉPISODES</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Separator */}
        <View style={s.sep} />

        {/* Courses list */}
        <View style={s.coursesSection}>
          <Text style={s.sectionLabel}>COURS DU PROGRAMME</Text>

          {courses.length === 0 ? (
            <Text style={s.empty}>Aucun cours disponible pour ce cursus.</Text>
          ) : (
            courses.map((course: any, idx: number) => (
              <TouchableOpacity
                key={course.id}
                testID={`cursus-course-${course.id}`}
                style={s.courseCard}
                onPress={() => router.push(`/course/${course.id}` as any)}
                activeOpacity={0.8}
              >
                {/* Index number */}
                <Text style={[s.courseNum, { color: idx === 0 ? cursusColor : '#444' }]}>
                  {String(idx + 1).padStart(2, '0')}
                </Text>

                {/* Info */}
                <View style={s.courseInfo}>
                  <Text style={s.courseTitle} numberOfLines={2}>{course.title}</Text>
                  <Text style={s.courseScholar} numberOfLines={1}>{course.scholar_name}</Text>
                  <View style={s.courseMeta}>
                    {course.modules_count > 0 && (
                      <Text style={s.metaText}>{course.modules_count} épisodes</Text>
                    )}
                    {course.duration > 0 && (
                      <>
                        <View style={s.metaDot} />
                        <Text style={s.metaText}>{fmtDur(course.duration)}</Text>
                      </>
                    )}
                  </View>
                </View>

                {/* Arrow */}
                <Ionicons name="chevron-forward" size={16} color="#444" />
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  loadingWrap: { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' },

  // Nav
  navWrap: { backgroundColor: 'rgba(10,10,10,0.95)' },
  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#222222',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backLabel: { fontFamily: 'Cinzel', fontSize: 8, letterSpacing: 3, color: '#777777', textTransform: 'uppercase' },

  // Header
  header: { flexDirection: 'row' },
  cursusBar: { width: 4 },
  headerContent: { flex: 1, padding: 24 },

  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontFamily: 'Cinzel', fontSize: 7, letterSpacing: 3, textTransform: 'uppercase' },

  cursusLetter: {
    fontFamily: 'Cinzel', fontSize: 80, fontWeight: '600', lineHeight: 80,
    position: 'absolute', right: 24, top: 20, opacity: 1,
  },
  cursusName: {
    fontFamily: 'Cinzel', fontSize: 20, fontWeight: '400', color: '#F5F0E8',
    letterSpacing: 1, lineHeight: 28, marginBottom: 12,
  },
  cursusDesc: {
    fontFamily: 'EBGaramond', fontSize: 14, color: 'rgba(245,240,232,0.60)',
    lineHeight: 22, marginBottom: 16,
  },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  statItem: { alignItems: 'flex-start' },
  statValue: { fontFamily: 'Cinzel', fontSize: 20, fontWeight: '600' },
  statLabel: { fontFamily: 'Cinzel', fontSize: 7, letterSpacing: 2, color: '#777', textTransform: 'uppercase', marginTop: 2 },
  statDivider: { width: 1, height: 32 },

  sep: { height: 1, backgroundColor: '#222222', marginHorizontal: 20 },

  // Courses
  coursesSection: { padding: 20 },
  sectionLabel: {
    fontFamily: 'Cinzel', fontSize: 8, letterSpacing: 4, color: '#777777',
    textTransform: 'uppercase', marginBottom: 14,
  },
  empty: { fontFamily: 'EBGaramond', fontSize: 14, color: '#777', fontStyle: 'italic', paddingVertical: 20 },

  courseCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#1A1A1A', padding: 14, marginBottom: 2,
    borderWidth: 1, borderColor: '#222222',
  },
  courseNum: { fontFamily: 'Cinzel', fontSize: 18, fontWeight: '600', width: 28, textAlign: 'center', flexShrink: 0 },
  courseInfo: { flex: 1, minWidth: 0 },
  courseTitle: { fontFamily: 'EBGaramond', fontSize: 14, color: '#F5F0E8', lineHeight: 20, marginBottom: 4 },
  courseScholar: { fontFamily: 'EBGaramond', fontSize: 12, fontStyle: 'italic', color: '#C9A84C', marginBottom: 4 },
  courseMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontFamily: 'Cinzel', fontSize: 7, letterSpacing: 1, color: '#777', textTransform: 'uppercase' },
  metaDot: { width: 2, height: 2, borderRadius: 1, backgroundColor: '#444' },
});
