import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, apiRequest } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const CURSUS_COLORS: Record<string, string> = {
  A: '#04D182',
  B: '#8B5CF6',
  C: '#F59E0B',
  D: '#EC4899',
  E: '#06B6D4',
  F: '#C9A84C',
};

type LibraryTab = 'en_cours' | 'favoris' | 'termines';

interface InProgressItem {
  id: string;
  title: string;
  cursus_letter: string;
  episode_num: number;
  listened_minutes: number;
  total_minutes: number;
  progress: number;
}

interface FavoriteItem {
  id: string;
  title: string;
  cursus_letter: string;
  duration_minutes: number;
  saved_date: string;
}

// Données statiques pour la démo
const STATIC_IN_PROGRESS: InProgressItem[] = [
  {
    id: 'aud_kindi-001',
    title: 'Al-Kindī — Le premier philosophe arabe',
    cursus_letter: 'A',
    episode_num: 2,
    listened_minutes: 24,
    total_minutes: 48,
    progress: 50,
  },
  {
    id: 'aud_coran-001',
    title: 'Transmission du Coran — Histoire critique',
    cursus_letter: 'C',
    episode_num: 1,
    listened_minutes: 12,
    total_minutes: 55,
    progress: 22,
  },
];

const STATIC_FAVORITES: FavoriteItem[] = [
  {
    id: 'fav_1',
    title: "Averroès — Le commentateur d'Aristote",
    cursus_letter: 'A',
    duration_minutes: 62,
    saved_date: 'Il y a 2j',
  },
  {
    id: 'fav_2',
    title: "La poésie soufie — De Rūmī à Ibn ʿArabī",
    cursus_letter: 'D',
    duration_minutes: 55,
    saved_date: 'Il y a 5j',
  },
  {
    id: 'fav_3',
    title: "Maimonide et la tradition juive en Islam",
    cursus_letter: 'E',
    duration_minutes: 44,
    saved_date: 'Il y a 1s',
  },
  {
    id: 'fav_4',
    title: "Al-Ghazālī et la critique des philosophes",
    cursus_letter: 'B',
    duration_minutes: 51,
    saved_date: 'Il y a 2s',
  },
];

function formatDuration(minutes: number): string {
  if (!minutes) return '0 min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m.toString().padStart(2, '0')}min`;
  if (h > 0) return `${h}h`;
  return `${m} min`;
}

export default function BibliothequeScreen() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<LibraryTab>('en_cours');
  const [inProgress, setInProgress] = useState<InProgressItem[]>(STATIC_IN_PROGRESS);
  const [favorites, setFavorites] = useState<FavoriteItem[]>(STATIC_FAVORITES);
  const [completed, setCompleted] = useState<any[]>([]);

  // User info
  const userName = user?.name || user?.email?.split('@')[0] || 'Utilisateur';
  const userInitial = userName.charAt(0).toUpperCase();
  const isSubscribed = user?.subscription_status === 'active';

  // Global progress (mock)
  const globalProgress = 35;

  const loadData = useCallback(async () => {
    try {
      // Load user progress from API
      if (token) {
        const progressRes = await apiRequest('/user/progress', token);
        if (progressRes.ok) {
          const progressData = await progressRes.json();
          // TODO: Process progress data into in_progress and completed lists
        }

        const favRes = await apiRequest('/user/favorites', token);
        if (favRes.ok) {
          const favData = await favRes.json();
          if (favData && favData.length > 0) {
            // TODO: Map favorites to FavoriteItem format
          }
        }
      }
    } catch (e) {
      console.error('Failed to load library data', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = () => { setRefreshing(true); loadData(); };

  const handleResumeEpisode = (id: string) => {
    router.push(`/audio/${id}?autoplay=1` as any);
  };

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
            BARRE DE NAVIGATION HAUTE (sticky)
        ═══════════════════════════════════════════════════════════════════════ */}
        <View style={styles.navBar}>
          <View style={styles.navLogo}>
            <Text style={styles.navLogoText}>SIJILL</Text>
            <View style={styles.navLogoDot} />
          </View>
          <TouchableOpacity style={styles.navMoreBtn}>
            <Ionicons name="ellipsis-horizontal" size={20} color="rgba(245,240,232,0.6)" />
          </TouchableOpacity>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════════
            BLOC PROFIL UTILISATEUR
        ═══════════════════════════════════════════════════════════════════════ */}
        <View style={styles.profileBlock}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{userInitial}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userName}</Text>
            <Text style={styles.profileStatus}>
              {isSubscribed ? 'Abonnée Pro' : 'Compte gratuit'}
            </Text>
          </View>
          <View style={styles.profileProgress}>
            <Text style={styles.profileProgressValue}>{globalProgress}%</Text>
            <Text style={styles.profileProgressLabel}>Progression</Text>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════════
            ONGLETS INTERNES
        ═══════════════════════════════════════════════════════════════════════ */}
        <View style={styles.tabsWrap}>
          {(['en_cours', 'favoris', 'termines'] as LibraryTab[]).map((tab) => {
            const isActive = activeTab === tab;
            const label = tab === 'en_cours' ? 'En cours' : tab === 'favoris' ? 'Favoris' : 'Terminés';
            return (
              <TouchableOpacity
                key={tab}
                testID={`biblio-tab-${tab}`}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ═══════════════════════════════════════════════════════════════════════
            CONTENU — ONGLET "EN COURS"
        ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'en_cours' && (
          <View style={styles.tabContent}>
            {/* Section: Reprendre où vous en étiez */}
            <Text style={styles.sectionLabelGreen}>Reprendre où vous en étiez</Text>
            
            {inProgress.map((item) => {
              const color = CURSUS_COLORS[item.cursus_letter] || '#04D182';
              const remainingMinutes = item.total_minutes - item.listened_minutes;
              
              return (
                <View key={item.id} style={styles.progressCard}>
                  <View style={styles.progressCardHeader}>
                    <View style={styles.progressCardInfo}>
                      <Text style={styles.progressCardTitle}>{item.title}</Text>
                      <Text style={styles.progressCardMeta}>
                        Cursus {item.cursus_letter} · Épisode {item.episode_num} · {item.listened_minutes} min écoutées
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.resumeBtn}
                      onPress={() => handleResumeEpisode(item.id)}
                    >
                      <Text style={styles.resumeBtnText}>Reprendre</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${item.progress}%`, backgroundColor: color }]} />
                  </View>
                  <Text style={[styles.progressText, { color }]}>
                    {item.progress}% · {remainingMinutes} min restantes
                  </Text>
                </View>
              );
            })}

            {inProgress.length === 0 && (
              <Text style={styles.emptyText}>Aucun épisode en cours.</Text>
            )}

            {/* Section: Épisodes sauvegardés */}
            <Text style={[styles.sectionLabelGray, { marginTop: 16 }]}>Épisodes sauvegardés</Text>

            {favorites.map((item, idx) => {
              const color = CURSUS_COLORS[item.cursus_letter] || '#04D182';
              
              return (
                <FavoriteRow
                  key={item.id}
                  color={color}
                  title={item.title}
                  cursusLetter={item.cursus_letter}
                  durationMinutes={item.duration_minutes}
                  savedDate={item.saved_date}
                  isLast={idx === favorites.length - 1}
                  onPress={() => router.push(`/audio/${item.id}` as any)}
                />
              );
            })}

            {favorites.length === 0 && (
              <Text style={styles.emptyText}>Aucun épisode sauvegardé.</Text>
            )}
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            CONTENU — ONGLET "FAVORIS"
        ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'favoris' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionLabelGreen}>Vos favoris</Text>
            
            {favorites.map((item, idx) => {
              const color = CURSUS_COLORS[item.cursus_letter] || '#04D182';
              
              return (
                <FavoriteRow
                  key={item.id}
                  color={color}
                  title={item.title}
                  cursusLetter={item.cursus_letter}
                  durationMinutes={item.duration_minutes}
                  savedDate={item.saved_date}
                  isLast={idx === favorites.length - 1}
                  onPress={() => router.push(`/audio/${item.id}` as any)}
                />
              );
            })}

            {favorites.length === 0 && (
              <Text style={styles.emptyText}>Aucun favori enregistré.</Text>
            )}
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            CONTENU — ONGLET "TERMINÉS"
        ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'termines' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionLabelGreen}>Épisodes terminés</Text>
            
            {completed.length === 0 && (
              <Text style={styles.emptyText}>Aucun épisode terminé pour l'instant.</Text>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ─── Favorite Row Component ───────────────────────────────────────────────────
interface FavoriteRowProps {
  color: string;
  title: string;
  cursusLetter: string;
  durationMinutes: number;
  savedDate: string;
  isLast: boolean;
  onPress: () => void;
}

function FavoriteRow({ color, title, cursusLetter, durationMinutes, savedDate, isLast, onPress }: FavoriteRowProps) {
  const [hovered, setHovered] = useState(false);
  const hoverProps = Platform.OS === 'web' ? {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  } : {};

  return (
    <TouchableOpacity
      style={[
        styles.favoriteRow,
        !isLast && styles.favoriteRowBorder,
        hovered && styles.favoriteRowHover,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
      {...hoverProps}
    >
      <View style={[styles.favoriteDot, { backgroundColor: color }]} />
      <View style={styles.favoriteInfo}>
        <Text style={styles.favoriteTitle}>{title}</Text>
        <Text style={styles.favoriteMeta}>
          Cursus {cursusLetter} · {formatDuration(durationMinutes)}
        </Text>
      </View>
      <Text style={styles.favoriteDate}>{savedDate}</Text>
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
  navMoreBtn: {
    padding: 6,
  },

  // Profil utilisateur
  profileBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  profileAvatar: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(4,209,130,0.15)',
  },
  profileAvatarText: {
    fontFamily: 'Cinzel',
    fontSize: 16,
    fontWeight: '600',
    color: '#04D182',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: 'Cinzel',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    color: '#F5F0E8',
    marginBottom: 3,
  },
  profileStatus: {
    fontFamily: 'EBGaramond',
    fontSize: 11,
    fontStyle: 'italic',
    color: '#C9A84C',
  },
  profileProgress: {
    alignItems: 'flex-end',
  },
  profileProgressValue: {
    fontFamily: 'Cinzel',
    fontSize: 16,
    fontWeight: '600',
    color: '#04D182',
  },
  profileProgressLabel: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    letterSpacing: 2,
    color: '#777777',
    textTransform: 'uppercase',
  },

  // Onglets internes
  tabsWrap: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
    paddingHorizontal: 20,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#04D182',
  },
  tabText: {
    fontFamily: 'Cinzel',
    fontSize: 8,
    letterSpacing: 3,
    color: '#777777',
    textTransform: 'uppercase',
  },
  tabTextActive: {
    color: '#F5F0E8',
  },

  // Contenu des tabs
  tabContent: {
    paddingTop: 14,
  },
  sectionLabelGreen: {
    fontFamily: 'Cinzel',
    fontSize: 8,
    letterSpacing: 3,
    color: '#04D182',
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionLabelGray: {
    fontFamily: 'Cinzel',
    fontSize: 8,
    letterSpacing: 3,
    color: '#777777',
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  emptyText: {
    fontFamily: 'EBGaramond',
    fontSize: 14,
    color: '#777777',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },

  // Carte de progression
  progressCard: {
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: '#1A1A1A',
    padding: 16,
  },
  progressCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  progressCardInfo: {
    flex: 1,
  },
  progressCardTitle: {
    fontFamily: 'EBGaramond',
    fontSize: 14,
    color: '#F5F0E8',
    lineHeight: 20,
    marginBottom: 3,
  },
  progressCardMeta: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    letterSpacing: 2,
    color: '#777777',
    textTransform: 'uppercase',
  },
  resumeBtn: {
    backgroundColor: '#04D182',
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginTop: 2,
    flexShrink: 0,
  },
  resumeBtnText: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    letterSpacing: 2,
    color: '#0A0A0A',
    textTransform: 'uppercase',
  },
  progressBar: {
    marginTop: 12,
    marginBottom: 6,
    height: 2,
    backgroundColor: '#222222',
    overflow: 'hidden',
  },
  progressFill: {
    height: 2,
  },
  progressText: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Ligne de favori
  favoriteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    ...(Platform.OS === 'web' ? { 
      transition: 'background-color 0.2s ease',
      cursor: 'pointer',
    } as any : {}),
  },
  favoriteRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  favoriteRowHover: {
    backgroundColor: '#1A1A1A',
  },
  favoriteDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  favoriteInfo: {
    flex: 1,
    minWidth: 0,
  },
  favoriteTitle: {
    fontFamily: 'EBGaramond',
    fontSize: 14,
    color: '#F5F0E8',
    marginBottom: 3,
  },
  favoriteMeta: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    letterSpacing: 2,
    color: '#777777',
    textTransform: 'uppercase',
  },
  favoriteDate: {
    fontFamily: 'EBGaramond',
    fontSize: 12,
    fontStyle: 'italic',
    color: '#777777',
    flexShrink: 0,
  },
});
