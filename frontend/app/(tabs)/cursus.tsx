import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, apiRequest } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const CURSUS_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const CURSUS_COLORS: Record<string, string> = {
  A: '#04D182',
  B: '#8B5CF6',
  C: '#F59E0B',
  D: '#EC4899',
  E: '#06B6D4',
  F: '#C9A84C',
};

const CURSUS_SHORT_NAMES: Record<string, string> = {
  A: 'Falsafa',
  B: 'Kalām',
  C: 'Sciences',
  D: 'Arts',
  E: 'Connexions',
};

// Données statiques pour les descriptions (à remplacer par API)
const CURSUS_DATA: Record<string, { title: string; description: string }> = {
  A: {
    title: 'Philosophie islamique',
    description: "D'Al-Kindī à Ibn Khaldūn — la grande tradition philosophique de l'Islam classique.",
  },
  B: {
    title: 'Théologie & Droit',
    description: 'Les grandes écoles de théologie rationnelle et les fondements du droit islamique.',
  },
  C: {
    title: 'Sciences islamiques',
    description: 'Coran, hadith, historiographie — les sciences qui ont structuré la civilisation islamique.',
  },
  D: {
    title: 'Arts, Sciences & Géographie',
    description: 'Poésie, médecine, géographie, musique — les arts et les sciences de la civilisation arabo-islamique.',
  },
  E: {
    title: 'Philosophies connectées',
    description: 'Dialogue entre Islam, christianisme oriental, soufisme, ismaélisme et judaïsme médiéval.',
  },
};

function fmtDur(minutes: number): string {
  if (!minutes) return '0h';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

interface Cursus {
  id: string;
  name: string;
  description?: string;
  order: number;
  courses_count?: number;
  episodes_count?: number;
  total_duration?: number;
  progress?: number;
}

export default function CursusScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [cursus, setCursus] = useState<Cursus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [cursusRes, progressRes] = await Promise.all([
        apiRequest('/cursus', token),
        token ? apiRequest('/user/progress', token) : Promise.resolve({ ok: false }),
      ]);

      // Build progress map (audio_id -> progress data)
      const progressMap: Record<string, any> = {};
      if (progressRes.ok) {
        const progressData = await progressRes.json();
        (progressData || []).forEach((p: any) => {
          progressMap[p.content_id] = p;
        });
      }

      if (cursusRes.ok) {
        const data = await cursusRes.json();
        
        // Enrich cursus with stats and progress
        const enriched = await Promise.all(
          data.map(async (c: any) => {
            try {
              const coursesRes = await apiRequest(`/courses?cursus_id=${c.id}`, token);
              if (coursesRes.ok) {
                const courses = await coursesRes.json();
                let totalEpisodes = 0;
                let totalDuration = 0;
                let completedEpisodes = 0;
                
                // Get playlist for each course to count completed episodes
                for (const course of courses) {
                  totalEpisodes += course.modules_count || 0;
                  totalDuration += course.duration || 0;
                  
                  // Fetch playlist to check progress
                  try {
                    const playlistRes = await apiRequest(`/courses/${course.id}/playlist`, token);
                    if (playlistRes.ok) {
                      const playlist = await playlistRes.json();
                      for (const ep of playlist) {
                        const epProgress = progressMap[ep.audio_id];
                        if (epProgress && (epProgress.completed || epProgress.progress >= 0.9)) {
                          completedEpisodes++;
                        }
                      }
                    }
                  } catch (e) {}
                }
                
                const progress = totalEpisodes > 0 
                  ? Math.round((completedEpisodes / totalEpisodes) * 100) 
                  : 0;
                
                return {
                  ...c,
                  courses_count: courses.length,
                  episodes_count: totalEpisodes,
                  total_duration: Math.round(totalDuration / 60), // en minutes
                  progress,
                  completed_episodes: completedEpisodes,
                };
              }
            } catch (e) {}
            return c;
          })
        );
        setCursus(enriched.sort((a: Cursus, b: Cursus) => a.order - b.order));
      }
    } catch (e) {
      console.error('Failed to load cursus data', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = () => { setRefreshing(true); loadData(); };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#04D182" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#04D182" />
        }
      >
        {/* ═══════════════════════════════════════════════════════════════════════
            NAVIGATION HAUTE (sticky)
        ═══════════════════════════════════════════════════════════════════════ */}
        <View style={styles.navBar}>
          <View style={styles.navLogo}>
            <Text style={styles.navLogoText}>SIJILL</Text>
            <View style={styles.navLogoDot} />
          </View>
          <TouchableOpacity 
            testID="cursus-search-btn"
            style={styles.navSearchBtn}
            onPress={() => router.push('/search' as any)}
          >
            <Ionicons name="search-outline" size={20} color="rgba(245,240,232,0.6)" />
          </TouchableOpacity>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════════
            HERO CURSUS
        ═══════════════════════════════════════════════════════════════════════ */}
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>{cursus.length} Cursus disponibles</Text>
          <Text style={styles.heroTitle}>Les grandes voies du savoir islamique</Text>
          <Text style={styles.heroSubtitle}>Choisissez votre parcours d'étude</Text>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════════
            LISTE DES CURSUS
        ═══════════════════════════════════════════════════════════════════════ */}
        <View style={styles.cursusList}>
          {cursus.map((c, idx) => {
            const letter = CURSUS_LETTERS[Math.min(idx, CURSUS_LETTERS.length - 1)];
            const color = CURSUS_COLORS[letter] || '#04D182';
            const shortName = CURSUS_SHORT_NAMES[letter] || c.name?.split(' ')[0] || '';
            const staticData = CURSUS_DATA[letter];
            
            const title = staticData?.title || c.name || `Cursus ${letter}`;
            const description = staticData?.description || c.description || '';
            const episodesCount = c.episodes_count || 0;
            const durationMinutes = c.total_duration || 0;
            const progress = c.progress || 0;

            return (
              <CursusCard
                key={c.id}
                id={c.id}
                letter={letter}
                shortName={shortName}
                color={color}
                title={title}
                description={description}
                coursesCount={c.courses_count || 0}
                episodesCount={episodesCount}
                durationMinutes={durationMinutes}
                progress={progress}
                onPress={() => router.push(`/cursus/${c.id}` as any)}
              />
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ─── Cursus Card Component ────────────────────────────────────────────────────
interface CursusCardProps {
  id: string;
  letter: string;
  shortName: string;
  color: string;
  title: string;
  description: string;
  coursesCount: number;
  episodesCount: number;
  durationMinutes: number;
  progress: number;
  onPress: () => void;
}

function CursusCard({
  id, letter, shortName, color, title, description,
  coursesCount, episodesCount, durationMinutes, progress, onPress,
}: CursusCardProps) {
  const [hovered, setHovered] = useState(false);
  const hoverProps = Platform.OS === 'web' ? {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  } : {};

  return (
    <TouchableOpacity
      testID={`cursus-card-${id}`}
      style={[
        styles.card,
        { borderLeftColor: color },
        hovered && styles.cardHover,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
      {...hoverProps}
    >
      {/* Ligne 1: Tag + Stats */}
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTag, { color }]}>
          Cursus {letter} · {shortName}
        </Text>
        <Text style={styles.cardHeaderStats}>
          {coursesCount} cours · {fmtDur(durationMinutes)}
        </Text>
      </View>

      {/* Ligne 2: Titre */}
      <Text style={styles.cardTitle}>{title}</Text>

      {/* Ligne 3: Description */}
      {description ? (
        <Text style={styles.cardDescription} numberOfLines={2}>{description}</Text>
      ) : null}

      {/* Ligne 4: Footer Stats */}
      <View style={styles.cardFooter}>
        <View style={styles.cardStat}>
          <Ionicons name="play-circle-outline" size={10} color="#777777" />
          <Text style={styles.cardStatText}>{episodesCount} épisodes</Text>
        </View>
        <View style={styles.cardStat}>
          <Ionicons name="time-outline" size={10} color="#777777" />
          <Text style={styles.cardStatText}>{fmtDur(durationMinutes)}</Text>
        </View>
        {progress > 0 && (
          <View style={[styles.cardProgressBadge, { backgroundColor: `${color}1A` }]}>
            <Text style={[styles.cardProgressBadgeText, { color }]}>{progress}% complété</Text>
          </View>
        )}
      </View>

      {/* Ligne 5: Barre de progression */}
      <View style={styles.cardProgressTrack}>
        <View style={[styles.cardProgressFill, { width: `${progress}%`, backgroundColor: color }]} />
      </View>
      {progress > 0 && (
        <Text style={[styles.cardProgressLabel, { color }]}>
          {progress}% — Continuer votre progression
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  loadingWrap: { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' },

  // Navigation haute
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'rgba(10,10,10,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(12px)' } as any : {}),
  },
  navLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navLogoText: {
    fontFamily: 'Cinzel',
    fontSize: 16,
    letterSpacing: 4,
    color: '#F5F0E8',
  },
  navLogoDot: {
    width: 6,
    height: 6,
    backgroundColor: '#04D182',
  },
  navSearchBtn: {
    padding: 6,
  },

  // Hero
  hero: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 20,
    ...(Platform.OS === 'web' ? {
      background: 'linear-gradient(160deg, #111111 0%, #0A0A0A 100%)',
    } as any : { backgroundColor: '#0F0F0F' }),
  },
  heroEyebrow: {
    fontFamily: 'Cinzel',
    fontSize: 8,
    letterSpacing: 4,
    color: '#04D182',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroTitle: {
    fontFamily: 'Cinzel',
    fontSize: 20,
    fontWeight: '400',
    letterSpacing: 1.5,
    color: '#F5F0E8',
    lineHeight: 26,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontFamily: 'EBGaramond',
    fontSize: 14,
    fontStyle: 'italic',
    color: '#777777',
  },

  // Liste des cursus
  cursusList: {
    paddingTop: 16,
    paddingBottom: 16,
  },

  // Carte Cursus
  card: {
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: '#111111',
    padding: 18,
    borderLeftWidth: 3,
    ...(Platform.OS === 'web' ? { 
      transition: 'background-color 0.2s ease',
      cursor: 'pointer',
    } as any : {}),
  },
  cardHover: {
    backgroundColor: '#1A1A1A',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTag: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  cardHeaderStats: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    letterSpacing: 1,
    color: '#777777',
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontFamily: 'Cinzel',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 1,
    color: '#F5F0E8',
    lineHeight: 20,
    marginBottom: 8,
  },
  cardDescription: {
    fontFamily: 'EBGaramond',
    fontSize: 13,
    color: 'rgba(245,240,232,0.6)',
    lineHeight: 19.5,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  cardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardStatText: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    letterSpacing: 2,
    color: '#777777',
    textTransform: 'uppercase',
  },
  cardProgressBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginLeft: 'auto',
  },
  cardProgressBadgeText: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardProgressTrack: {
    marginTop: 12,
    height: 2,
    backgroundColor: '#222222',
    overflow: 'hidden',
  },
  cardProgressFill: {
    height: 2,
  },
  cardProgressLabel: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 6,
  },
});
