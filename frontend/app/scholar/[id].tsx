import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Platform, Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { apiRequest, useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://sijill-website-dev.preview.emergentagent.com';

const CURSUS_COLORS: Record<string, string> = {
  A: '#04D182',
  B: '#8B5CF6',
  C: '#F59E0B',
  D: '#EC4899',
  E: '#06B6D4',
};

function formatDuration(seconds: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m} min`;
}

export default function ScholarDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const [scholar, setScholar] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [audios, setAudios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [schResp, coursesResp, audiosResp] = await Promise.all([
          apiRequest(`/scholars/${id}`, token),
          apiRequest(`/courses?scholar_id=${id}`, token),
          apiRequest(`/audios?scholar_id=${id}`, token),
        ]);
        if (schResp.ok) setScholar(await schResp.json());
        if (coursesResp.ok) setCourses(await coursesResp.json());
        if (audiosResp.ok) setAudios(await audiosResp.json());
      } catch (e) {
        console.error('Error loading scholar:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#04D182" />
      </View>
    );
  }

  if (!scholar) return null;

  // Get initials
  const initials = scholar.name
    ? scholar.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'XX';

  // Primary color (from first cursus if available)
  const primaryColor = '#04D182';

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ═══════════════════════════════════════════════════════════════════════
            HERO
        ═══════════════════════════════════════════════════════════════════════ */}
        <View style={styles.hero}>
          {/* Back button */}
          <TouchableOpacity
            testID="scholar-back-btn"
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={20} color="rgba(245,240,232,0.6)" />
            <Text style={styles.backLabel}>Professeurs</Text>
          </TouchableOpacity>

          {/* Avatar with Photo */}
          {scholar.photo ? (
            <Image
              source={{ uri: scholar.photo.startsWith('http') ? scholar.photo : `${API_URL}${scholar.photo.startsWith('/') ? '' : '/'}${scholar.photo}` }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: `${primaryColor}1A` }]}>
              <Text style={[styles.avatarText, { color: primaryColor }]}>{initials}</Text>
            </View>
          )}

          {/* Name */}
          <Text style={styles.name}>{scholar.name}</Text>

          {/* University */}
          {scholar.university && (
            <Text style={styles.university}>{scholar.university}</Text>
          )}

          {/* Bio/Specialty */}
          {scholar.bio && (
            <Text style={styles.bio} numberOfLines={3}>{scholar.bio}</Text>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Text style={[styles.statValue, { color: primaryColor }]}>{courses.length}</Text>
              <Text style={styles.statLabel}>Cours</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={[styles.statValue, { color: primaryColor }]}>{audios.length}</Text>
              <Text style={styles.statLabel}>Épisodes</Text>
            </View>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════════
            COURS
        ═══════════════════════════════════════════════════════════════════════ */}
        {courses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Cours</Text>
            {courses.map((course, idx) => (
              <CourseCard
                key={course.id}
                course={course}
                onPress={() => router.push(`/course/${course.id}` as any)}
                isLast={idx === courses.length - 1}
              />
            ))}
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            ÉPISODES
        ═══════════════════════════════════════════════════════════════════════ */}
        {audios.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Épisodes récents</Text>
            {audios.slice(0, 5).map((audio, idx) => (
              <AudioRow
                key={audio.id}
                audio={audio}
                onPress={() => router.push(`/audio/${audio.id}` as any)}
                isLast={idx === Math.min(4, audios.length - 1)}
              />
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ─── Course Card Component ────────────────────────────────────────────────────
function CourseCard({ course, onPress, isLast }: { course: any; onPress: () => void; isLast: boolean }) {
  const [hovered, setHovered] = useState(false);
  const hoverProps = Platform.OS === 'web' ? {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  } : {};

  const cursusLetter = course.cursus_letter || 'A';
  const color = CURSUS_COLORS[cursusLetter] || '#04D182';

  return (
    <TouchableOpacity
      testID={`scholar-course-${course.id}`}
      style={[
        styles.courseCard,
        hovered && styles.courseCardHover,
        { borderLeftColor: color },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
      {...hoverProps}
    >
      <View style={styles.courseInfo}>
        <Text style={[styles.courseTag, { color }]}>
          Cursus {cursusLetter}
        </Text>
        <Text style={styles.courseTitle}>{course.title}</Text>
        <Text style={styles.courseMeta}>
          {course.modules_count || 0} épisodes · {formatDuration(course.duration || 0)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#444444" />
    </TouchableOpacity>
  );
}

// ─── Audio Row Component ──────────────────────────────────────────────────────
function AudioRow({ audio, onPress, isLast }: { audio: any; onPress: () => void; isLast: boolean }) {
  const [hovered, setHovered] = useState(false);
  const hoverProps = Platform.OS === 'web' ? {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  } : {};

  const cursusLetter = audio.cursus_letter || 'A';
  const color = CURSUS_COLORS[cursusLetter] || '#04D182';

  return (
    <TouchableOpacity
      testID={`scholar-audio-${audio.id}`}
      style={[
        styles.audioRow,
        !isLast && styles.audioRowBorder,
        hovered && styles.audioRowHover,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
      {...hoverProps}
    >
      <View style={[styles.audioDot, { backgroundColor: color }]} />
      <View style={styles.audioInfo}>
        <Text style={styles.audioTitle} numberOfLines={1}>{audio.title}</Text>
        <Text style={styles.audioMeta}>
          {formatDuration(audio.duration || 0)}
        </Text>
      </View>
      <View style={[styles.playBtn, { backgroundColor: color }]}>
        <Ionicons name="play" size={12} color="#0A0A0A" style={{ marginLeft: 1 }} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  loadingWrap: { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' },

  // Hero
  hero: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
    ...(Platform.OS === 'web' ? {
      background: 'linear-gradient(160deg, #111111 0%, #0A0A0A 100%)',
    } as any : { backgroundColor: '#0F0F0F' }),
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 20,
  },
  backLabel: {
    fontFamily: 'Cinzel',
    fontSize: 8,
    letterSpacing: 2,
    color: 'rgba(245,240,232,0.5)',
    textTransform: 'uppercase',
  },
  avatar: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  avatarText: {
    fontFamily: 'Cinzel',
    fontSize: 24,
    fontWeight: '600',
  },
  name: {
    fontFamily: 'Cinzel',
    fontSize: 18,
    fontWeight: '600',
    color: '#F5F0E8',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 4,
  },
  university: {
    fontFamily: 'EBGaramond',
    fontSize: 14,
    fontStyle: 'italic',
    color: '#C9A84C',
    textAlign: 'center',
    marginBottom: 12,
  },
  bio: {
    fontFamily: 'EBGaramond',
    fontSize: 13,
    color: 'rgba(245,240,232,0.6)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  statBlock: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  statValue: {
    fontFamily: 'Cinzel',
    fontSize: 20,
    fontWeight: '600',
  },
  statLabel: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    letterSpacing: 2,
    color: '#777777',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#333333',
  },

  // Sections
  section: {
    paddingTop: 18,
  },
  sectionLabel: {
    fontFamily: 'Cinzel',
    fontSize: 8,
    letterSpacing: 4,
    color: '#04D182',
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    marginBottom: 12,
  },

  // Course Card
  courseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: '#111111',
    padding: 16,
    borderLeftWidth: 3,
    ...(Platform.OS === 'web' ? { 
      transition: 'background-color 0.2s ease',
      cursor: 'pointer',
    } as any : {}),
  },
  courseCardHover: {
    backgroundColor: '#1A1A1A',
  },
  courseInfo: {
    flex: 1,
  },
  courseTag: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  courseTitle: {
    fontFamily: 'Cinzel',
    fontSize: 12,
    fontWeight: '600',
    color: '#F5F0E8',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  courseMeta: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    letterSpacing: 1,
    color: '#777777',
    textTransform: 'uppercase',
  },

  // Audio Row
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    ...(Platform.OS === 'web' ? { 
      transition: 'background-color 0.2s ease',
      cursor: 'pointer',
    } as any : {}),
  },
  audioRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  audioRowHover: {
    backgroundColor: '#1A1A1A',
  },
  audioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  audioInfo: {
    flex: 1,
    minWidth: 0,
  },
  audioTitle: {
    fontFamily: 'EBGaramond',
    fontSize: 14,
    color: '#F5F0E8',
    marginBottom: 2,
  },
  audioMeta: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    letterSpacing: 1,
    color: '#777777',
    textTransform: 'uppercase',
  },
  playBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
