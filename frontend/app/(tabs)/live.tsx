import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, TextInput, Image,
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
  F: '#C2714F',
};

const CURSUS_SHORT_NAMES: Record<string, string> = {
  A: 'Falsafa',
  B: 'Kalām',
  C: 'Sciences',
  D: 'Arts',
  E: 'Connexions',
};

// Données statiques des professeurs (à remplacer par API)
const STATIC_PROFESSORS = [
  {
    id: 'prof-maroun-aouad',
    initials: 'MA',
    name: 'Prof. Maroun Aouad',
    university: 'Université Paris-Sorbonne',
    specialty: "Spécialiste d'Averroès et de la logique arabe médiévale",
    cursus: ['A'],
    courses_count: 3,
    episodes_count: 8,
  },
  {
    id: 'prof-daniel-de-smet',
    initials: 'DS',
    name: 'Prof. Daniel De Smet',
    university: 'CNRS · Paris',
    specialty: 'Philosophie arabe médiévale, ismaélisme, néoplatonisme',
    cursus: ['B', 'E'],
    courses_count: 2,
    episodes_count: 0,
  },
  {
    id: 'prof-eric-geoffroy',
    initials: 'EG',
    name: 'Prof. Éric Geoffroy',
    university: 'Université de Strasbourg',
    specialty: 'Soufisme, spiritualité islamique, Ibn ʿArabī',
    cursus: ['D', 'E'],
    courses_count: 2,
    episodes_count: 0,
  },
  {
    id: 'prof-roshdi-rashed',
    initials: 'RR',
    name: 'Prof. Roshdi Rashed',
    university: 'CNRS · Directeur émérite',
    specialty: 'Histoire des sciences arabes, mathématiques, optique',
    cursus: ['C'],
    courses_count: 2,
    episodes_count: 6,
  },
  {
    id: 'prof-colette-sirat',
    initials: 'CS',
    name: 'Prof. Colette Sirat',
    university: 'EPHE · Paris',
    specialty: "Philosophie juive médiévale en terre d'Islam",
    cursus: ['E'],
    courses_count: 1,
    episodes_count: 4,
  },
  {
    id: 'prof-marc-geoffroy',
    initials: 'MG',
    name: 'Prof. Marc Geoffroy',
    university: 'CNRS · UMR Orientale',
    specialty: 'Averroès, traductions latines, philosophie arabe',
    cursus: ['A'],
    courses_count: 1,
    episodes_count: 3,
  },
];

interface Professor {
  id: string;
  initials: string;
  name: string;
  university: string;
  specialty: string;
  cursus: string[];
  courses_count: number;
  episodes_count: number;
  photo?: string;
}

export default function ProfesseursScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [professors, setProfessors] = useState<Professor[]>(STATIC_PROFESSORS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // Try to load from API, fallback to static data
      const res = await apiRequest('/scholars', token);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const mapped = data.map((s: any) => ({
            id: s.id,
            initials: s.name?.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() || 'XX',
            name: s.name || 'Professeur',
            university: s.university || s.institution || '',
            specialty: s.bio || s.specialty || '',
            cursus: s.cursus_letters || ['A'],
            courses_count: s.courses_count || 0,
            episodes_count: s.episodes_count || 0,
            photo: s.photo || '',
          }));
          setProfessors(mapped.length > 0 ? mapped : STATIC_PROFESSORS);
        }
      }
    } catch (e) {
      console.error('Failed to load professors', e);
      // Keep static data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = () => { setRefreshing(true); loadData(); };

  // Filter professors by search query
  const filteredProfessors = useMemo(() => {
    if (!searchQuery.trim()) return professors;
    const q = searchQuery.toLowerCase();
    return professors.filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.university.toLowerCase().includes(q) ||
      p.specialty.toLowerCase().includes(q)
    );
  }, [professors, searchQuery]);

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
            EN-TÊTE DE PAGE
        ═══════════════════════════════════════════════════════════════════════ */}
        <View style={styles.header}>
          <Text style={styles.headerEyebrow}>{professors.length} professeurs</Text>
          <Text style={styles.headerTitle}>Les enseignants</Text>
          <Text style={styles.headerSubtitle}>Chercheurs et universitaires internationaux</Text>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════════
            BARRE DE RECHERCHE
        ═══════════════════════════════════════════════════════════════════════ */}
        <View style={[
          styles.searchBar,
          searchFocused && styles.searchBarFocused,
        ]}>
          <Ionicons name="search-outline" size={16} color="#777777" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un professeur…"
            placeholderTextColor="#444444"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#555555" />
            </TouchableOpacity>
          )}
        </View>

        {/* ═══════════════════════════════════════════════════════════════════════
            LISTE DES PROFESSEURS
        ═══════════════════════════════════════════════════════════════════════ */}
        <View style={styles.professorsList}>
          {filteredProfessors.map((prof) => (
            <ProfessorCard
              key={prof.id}
              professor={prof}
              onPress={() => router.push(`/scholar/${prof.id}` as any)}
            />
          ))}

          {filteredProfessors.length === 0 && (
            <Text style={styles.emptyText}>Aucun professeur trouvé.</Text>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ─── Professor Card Component ─────────────────────────────────────────────────
interface ProfessorCardProps {
  professor: Professor;
  onPress: () => void;
}

function ProfessorCard({ professor, onPress }: ProfessorCardProps) {
  const [hovered, setHovered] = useState(false);
  const hoverProps = Platform.OS === 'web' ? {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  } : {};

  // Primary cursus color (first in list)
  const primaryCursus = professor.cursus[0] || 'A';
  const primaryColor = CURSUS_COLORS[primaryCursus] || '#04D182';

  // Build stats string
  const statsText = professor.episodes_count > 0
    ? `${professor.courses_count} cours · ${professor.episodes_count} épisodes`
    : `${professor.courses_count} cours`;

  // Check if professor has a real photo
  const hasPhoto = professor.photo && !professor.photo.includes('unsplash');
  const [imageError, setImageError] = useState(false);

  return (
    <TouchableOpacity
      testID={`professor-card-${professor.id}`}
      style={[styles.card, hovered && styles.cardHover]}
      onPress={onPress}
      activeOpacity={0.85}
      {...hoverProps}
    >
      {/* Avatar or Photo */}
      {hasPhoto && !imageError ? (
        <Image 
          source={{ uri: professor.photo }} 
          style={[styles.photoAvatar, { borderColor: primaryColor }]}
          onError={() => setImageError(true)}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.avatar, { backgroundColor: `${primaryColor}1A` }]}>
          <Text style={[styles.avatarText, { color: primaryColor }]}>{professor.initials}</Text>
        </View>
      )}

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{professor.name}</Text>
        <Text style={styles.cardUniversity}>{professor.university}</Text>
        <Text style={styles.cardSpecialty} numberOfLines={2}>{professor.specialty}</Text>

        {/* Tags */}
        <View style={styles.tagsRow}>
          {professor.cursus.map((c) => {
            const color = CURSUS_COLORS[c] || '#04D182';
            const name = CURSUS_SHORT_NAMES[c] || c;
            return (
              <View key={c} style={[styles.tag, { backgroundColor: `${color}1A` }]}>
                <Text style={[styles.tagText, { color }]}>Cursus {c}</Text>
              </View>
            );
          })}
          <Text style={styles.statsText}>{statsText}</Text>
        </View>
      </View>
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
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#04D182',
    marginLeft: 3,
    marginBottom: 3,
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 8px rgba(4,209,130,0.5)' } as any : {}),
  },

  // En-tête
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 4,
  },
  headerEyebrow: {
    fontFamily: 'Cinzel',
    fontSize: 8,
    letterSpacing: 4,
    color: '#04D182',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  headerTitle: {
    fontFamily: 'Cinzel',
    fontSize: 20,
    fontWeight: '400',
    letterSpacing: 2,
    color: '#F5F0E8',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontFamily: 'EBGaramond',
    fontSize: 13,
    fontStyle: 'italic',
    color: '#777777',
  },

  // Barre de recherche
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginVertical: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#222222',
  },
  searchBarFocused: {
    borderColor: 'rgba(4,209,130,0.4)',
  },
  searchInput: {
    flex: 1,
    fontFamily: 'EBGaramond',
    fontSize: 14,
    color: '#F5F0E8',
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
  },

  // Liste
  professorsList: {
    paddingBottom: 20,
  },
  emptyText: {
    fontFamily: 'EBGaramond',
    fontSize: 14,
    color: '#777777',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 40,
  },

  // Carte professeur
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
    ...(Platform.OS === 'web' ? { 
      transition: 'background-color 0.2s ease',
      cursor: 'pointer',
    } as any : {}),
  },
  cardHover: {
    backgroundColor: '#1A1A1A',
  },

  // Avatar
  avatar: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontFamily: 'Cinzel',
    fontSize: 15,
    fontWeight: '600',
  },
  photoAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    flexShrink: 0,
  },

  // Info
  cardInfo: {
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    fontFamily: 'Cinzel',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    color: '#F5F0E8',
    marginBottom: 3,
  },
  cardUniversity: {
    fontFamily: 'EBGaramond',
    fontSize: 12,
    fontStyle: 'italic',
    color: '#C9A84C',
    marginBottom: 5,
  },
  cardSpecialty: {
    fontFamily: 'EBGaramond',
    fontSize: 12,
    color: '#777777',
    lineHeight: 17,
  },

  // Tags
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 6,
  },
  tag: {
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  tagText: {
    fontFamily: 'Cinzel',
    fontSize: 6,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  statsText: {
    fontFamily: 'Cinzel',
    fontSize: 7,
    letterSpacing: 2,
    color: '#777777',
    textTransform: 'uppercase',
  },
});
