import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth, apiRequest } from '../../context/AuthContext';
import { colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface Cursus {
  id: string;
  name: string;
  description: string;
  order: number;
  is_active: boolean;
  is_featured: boolean;
  hero_title?: string;
  hero_description?: string;
}

export default function AdminCursus() {
  const { token } = useAuth();
  const router = useRouter();
  const [cursusList, setCursusList] = useState<Cursus[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [heroTitle, setHeroTitle] = useState('');
  const [heroDescription, setHeroDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const loadCursus = useCallback(async () => {
    try {
      const resp = await apiRequest('/admin/cursus', token);
      if (resp.ok) {
        const data = await resp.json();
        setCursusList(data);
      }
    } catch (e) {
      console.error('Failed to load cursus', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadCursus(); }, [loadCursus]);

  const handleSetFeatured = async (cursusId: string) => {
    try {
      const resp = await apiRequest(`/admin/cursus/${cursusId}/set-featured`, token, { method: 'PATCH' });
      if (resp.ok) {
        setCursusList((prev) =>
          prev.map((c) => ({ ...c, is_featured: c.id === cursusId }))
        );
        Alert.alert('Succès', 'Cursus mis en avant sur la page d\'accueil');
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de mettre le cursus en avant');
    }
  };

  const handleStartEdit = (c: Cursus) => {
    setEditing(c.id);
    setHeroTitle(c.hero_title || '');
    setHeroDescription(c.hero_description || c.description || '');
  };

  const handleSaveHeroText = async (cursusId: string) => {
    setSaving(true);
    try {
      const resp = await apiRequest(`/admin/cursus/${cursusId}`, token, {
        method: 'PUT',
        body: JSON.stringify({
          hero_title: heroTitle.trim() || null,
          // Save to both description (visible everywhere) and hero_description for compat
          description: heroDescription.trim() || null,
          hero_description: heroDescription.trim() || null,
        }),
      });
      if (resp.ok) {
        setCursusList((prev) =>
          prev.map((c) => c.id === cursusId
            ? { ...c, hero_title: heroTitle.trim() || undefined, hero_description: heroDescription.trim() || undefined }
            : c
          )
        );
        setEditing(null);
        Alert.alert('Succès', 'Texte mis à jour');
      } else {
        const err = await resp.json();
        Alert.alert('Erreur', err.detail || 'Mise à jour échouée');
      }
    } catch (e) {
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  const CURSUS_COLORS: Record<number, string> = {
    1: '#04D182', 2: '#8B5CF6', 3: '#F59E0B', 4: '#EC4899', 5: '#06B6D4', 6: '#C9A84C',
  };

  const renderCursus = ({ item }: { item: Cursus }) => {
    const color = CURSUS_COLORS[item.order] || '#777777';
    const isCurrentlyEditing = editing === item.id;

    return (
      <View style={styles.card}>
        <View style={[styles.colorBar, { backgroundColor: color }]} />
        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cursusLabel, { color }]}>CURSUS {String.fromCharCode(64 + item.order)}</Text>
              <Text style={styles.cursusName}>{item.name}</Text>
              {item.hero_title ? (
                <Text style={styles.heroPreview} numberOfLines={1}>
                  Titre hero : "{item.hero_title}"
                </Text>
              ) : (
                <Text style={styles.noHeroText}>Aucun texte hero défini</Text>
              )}
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleSetFeatured(item.id)}
              >
                <Ionicons
                  name={item.is_featured ? 'star' : 'star-outline'}
                  size={22}
                  color={item.is_featured ? '#C9A84C' : colors.text.tertiary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => isCurrentlyEditing ? setEditing(null) : handleStartEdit(item)}
              >
                <Ionicons
                  name={isCurrentlyEditing ? 'close-circle-outline' : 'create-outline'}
                  size={22}
                  color={colors.brand.primary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {item.is_featured && (
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={12} color="#C9A84C" />
              <Text style={styles.featuredText}> À la une</Text>
            </View>
          )}

          {isCurrentlyEditing && (
            <View style={styles.editSection}>
              <Text style={styles.editLabel}>Titre hero (affiché en grand sur la page d'accueil)</Text>
              <TextInput
                style={styles.input}
                value={heroTitle}
                onChangeText={setHeroTitle}
                placeholder="Ex: La Falsafa — Philosophie de l'Islam classique"
                placeholderTextColor={colors.text.tertiary}
              />
              <Text style={styles.editLabel}>Description hero (paragraphe descriptif)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={heroDescription}
                onChangeText={setHeroDescription}
                placeholder="Ex: D'Al-Kindī à Averroès, sept siècles de pensée..."
                placeholderTextColor={colors.text.tertiary}
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={() => handleSaveHeroText(item.id)}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color="#000" />
                    <Text style={styles.saveBtnText}>Enregistrer</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Cursus — "À la une"</Text>
        <View style={{ width: 24 }} />
      </View>
      <Text style={styles.subtitle}>
        Appuyez sur l'étoile pour mettre un cursus en avant sur la page d'accueil.{'\n'}
        Modifiez le texte hero pour personnaliser ce qui s'affiche dans le bandeau principal.
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={cursusList.sort((a, b) => a.order - b.order)}
          keyExtractor={(item) => item.id}
          renderItem={renderCursus}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#222222',
  },
  title: { fontFamily: 'Cinzel', fontSize: 14, color: colors.text.primary, letterSpacing: 2 },
  subtitle: { fontSize: 12, color: colors.text.secondary, paddingHorizontal: 16, paddingVertical: 10, lineHeight: 18 },
  card: {
    flexDirection: 'row', backgroundColor: '#1A1A1A', marginBottom: 10,
    borderWidth: 1, borderColor: '#222222',
  },
  colorBar: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  cursusLabel: { fontFamily: 'Cinzel', fontSize: 8, letterSpacing: 2, marginBottom: 4 },
  cursusName: { fontFamily: 'Cinzel', fontSize: 14, color: colors.text.primary, marginBottom: 4 },
  heroPreview: { fontSize: 11, color: '#C9A84C', fontStyle: 'italic' },
  noHeroText: { fontSize: 11, color: colors.text.tertiary, fontStyle: 'italic' },
  cardActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 6 },
  featuredBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(201,168,76,0.12)', alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3, marginTop: 8,
  },
  featuredText: { fontFamily: 'Cinzel', fontSize: 8, color: '#C9A84C', letterSpacing: 1 },
  editSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#2A2A2A', paddingTop: 12 },
  editLabel: { fontSize: 12, color: colors.text.secondary, marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: '#111111', borderWidth: 1, borderColor: '#333333',
    padding: 10, color: colors.text.primary, fontSize: 13,
    fontFamily: 'EBGaramond',
  },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#04D182', paddingVertical: 10, gap: 6, marginTop: 12,
  },
  saveBtnText: { fontFamily: 'Cinzel', fontSize: 10, color: '#000', letterSpacing: 2 },
});
