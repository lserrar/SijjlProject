import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth, apiRequest } from '../../context/AuthContext';
import { colors, spacing, radius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

interface Scholar {
  id: string;
  name: string;
}

interface R2File {
  key: string;
  filename: string;
  size_mb: number;
}

interface Episode {
  id: string;
  title: string;
  episode_number: number;
  file_key: string;
}

export default function CourseForm() {
  const { token } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [scholars, setScholars] = useState<Scholar[]>([]);
  const [r2Folders, setR2Folders] = useState<string[]>([]);
  const [r2Files, setR2Files] = useState<R2File[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scholarId, setScholarId] = useState('');
  const [scholarName, setScholarName] = useState('');
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('Débutant');
  const [language, setLanguage] = useState('Français');
  const [modulesCount, setModulesCount] = useState('0');
  const [thumbnail, setThumbnail] = useState('');
  const [tags, setTags] = useState('');
  const [r2Folder, setR2Folder] = useState('');

  const [heroTitle, setHeroTitle] = useState('');
  const [heroDescription, setHeroDescription] = useState('');

  const TOPICS = ['Philosophie islamique', 'Tasawwuf', 'Fiqh', 'Histoire de l\'Islam', 'Sciences coraniques', 'Kalam'];
  const LEVELS = ['Débutant', 'Intermédiaire', 'Avancé'];
  const LANGUAGES = ['Français', 'Arabe', 'Anglais'];

  useEffect(() => {
    loadScholars();
    loadR2Folders();
    if (isEdit) {
      loadCourse();
      loadEpisodes();
    }
  }, [id]);

  const loadScholars = async () => {
    try {
      const resp = await apiRequest('/scholars', token);
      if (resp.ok) {
        const data = await resp.json();
        setScholars(data);
      }
    } catch (e) {
      console.error('Failed to load scholars', e);
    }
  };

  const loadR2Folders = async () => {
    try {
      const resp = await apiRequest('/admin/r2/folders', token);
      if (resp.ok) {
        const data = await resp.json();
        setR2Folders(data.folders || []);
      }
    } catch (e) {
      console.error('Failed to load R2 folders', e);
    }
  };

  const loadCourse = async () => {
    try {
      const resp = await apiRequest(`/courses/${id}`, token);
      if (resp.ok) {
        const data = await resp.json();
        setTitle(data.title || '');
        setDescription(data.description || '');
        setScholarId(data.scholar_id || '');
        setScholarName(data.scholar_name || '');
        setTopic(data.topic || '');
        setLevel(data.level || 'Débutant');
        setLanguage(data.language || 'Français');
        setModulesCount(String(data.modules_count || 0));
        setThumbnail(data.thumbnail || '');
        setTags((data.tags || []).join(', '));
        setR2Folder(data.r2_folder || '');
        setHeroTitle(data.hero_title || '');
        setHeroDescription(data.hero_description || '');
        if (data.r2_folder) {
          loadR2FolderFiles(data.r2_folder);
        }
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de charger le cours');
    } finally {
      setLoading(false);
    }
  };

  const loadEpisodes = async () => {
    try {
      const resp = await apiRequest(`/admin/courses/${id}/episodes`, token);
      if (resp.ok) {
        const data = await resp.json();
        setEpisodes(data.episodes || []);
      }
    } catch (e) {
      console.error('Failed to load episodes', e);
    }
  };

  const loadR2FolderFiles = async (folderName: string) => {
    try {
      const resp = await apiRequest(`/admin/r2/folder/${encodeURIComponent(folderName)}/files`, token);
      if (resp.ok) {
        const data = await resp.json();
        setR2Files(data.files || []);
      }
    } catch (e) {
      console.error('Failed to load R2 files', e);
    }
  };

  const handleScholarChange = (newId: string) => {
    setScholarId(newId);
    const scholar = scholars.find((s) => s.id === newId);
    if (scholar) setScholarName(scholar.name);
  };

  const handleSelectR2Folder = (folderName: string) => {
    setR2Folder(folderName);
    if (folderName) {
      loadR2FolderFiles(folderName);
    } else {
      setR2Files([]);
    }
  };

  const handleSyncR2 = async () => {
    if (!r2Folder) {
      Alert.alert('Erreur', 'Sélectionnez d\'abord un dossier R2');
      return;
    }
    if (!isEdit) {
      Alert.alert('Info', 'Enregistrez d\'abord le cours, puis synchronisez avec R2');
      return;
    }

    setSyncing(true);
    try {
      const resp = await apiRequest(`/admin/courses/${id}/sync-r2`, token, {
        method: 'POST',
        body: JSON.stringify({ r2_folder: r2Folder }),
      });

      if (resp.ok) {
        const data = await resp.json();
        Alert.alert(
          'Synchronisation réussie',
          `${data.episodes_created} épisode(s) créé(s)\n${data.episodes_updated} épisode(s) mis à jour\nTotal: ${data.total_episodes} épisode(s)`
        );
        loadEpisodes();
        setModulesCount(String(data.total_episodes));
      } else {
        const err = await resp.json();
        Alert.alert('Erreur', err.detail || 'Synchronisation échouée');
      }
    } catch (e) {
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !scholarId || !topic) {
      Alert.alert('Champs requis', 'Veuillez remplir le titre, l\'érudit et le sujet.');
      return;
    }

    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        description: description.trim(),
        scholar_id: scholarId,
        scholar_name: scholarName,
        topic,
        level,
        language,
        modules_count: parseInt(modulesCount) || 0,
        thumbnail: thumbnail.trim() || 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=600&q=80',
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        r2_folder: r2Folder,
        hero_title: heroTitle.trim() || null,
        hero_description: heroDescription.trim() || null,
      };

      const endpoint = isEdit ? `/admin/courses/${id}` : '/admin/courses';
      const method = isEdit ? 'PUT' : 'POST';

      const resp = await apiRequest(endpoint, token, {
        method,
        body: JSON.stringify(body),
      });

      if (resp.ok) {
        Alert.alert('Succès', isEdit ? 'Cours mis à jour' : 'Cours créé', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        const err = await resp.json();
        Alert.alert('Erreur', err.detail || 'Opération échouée');
      }
    } catch (e) {
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>{isEdit ? 'Modifier le cours' : 'Nouveau cours'}</Text>

          <Text style={styles.label}>Titre *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Titre du cours"
            placeholderTextColor={colors.text.tertiary}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Description du cours"
            placeholderTextColor={colors.text.tertiary}
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>Érudit *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={scholarId}
              onValueChange={handleScholarChange}
              style={styles.picker}
              dropdownIconColor={colors.text.secondary}
            >
              <Picker.Item label="Sélectionnez un érudit" value="" />
              {scholars.map((s) => (
                <Picker.Item key={s.id} label={s.name} value={s.id} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Sujet *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={topic}
              onValueChange={setTopic}
              style={styles.picker}
              dropdownIconColor={colors.text.secondary}
            >
              <Picker.Item label="Sélectionnez un sujet" value="" />
              {TOPICS.map((t) => (
                <Picker.Item key={t} label={t} value={t} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Niveau</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={level}
              onValueChange={setLevel}
              style={styles.picker}
              dropdownIconColor={colors.text.secondary}
            >
              {LEVELS.map((l) => (
                <Picker.Item key={l} label={l} value={l} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Langue</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={language}
              onValueChange={setLanguage}
              style={styles.picker}
              dropdownIconColor={colors.text.secondary}
            >
              {LANGUAGES.map((l) => (
                <Picker.Item key={l} label={l} value={l} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>URL de la miniature</Text>
          <TextInput
            style={styles.input}
            value={thumbnail}
            onChangeText={setThumbnail}
            placeholder="https://..."
            placeholderTextColor={colors.text.tertiary}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Tags (séparés par des virgules)</Text>
          <TextInput
            style={styles.input}
            value={tags}
            onChangeText={setTags}
            placeholder="Philosophie, Avicenne, Métaphysique"
            placeholderTextColor={colors.text.tertiary}
          />

          {/* R2 Folder Section */}
          <View style={styles.r2Section}>
            <Text style={styles.r2Title}>
              <Ionicons name="cloud-outline" size={18} color={colors.brand.primary} /> Dossier R2 (Audio)
            </Text>
            <Text style={styles.r2Hint}>
              Sélectionnez un dossier de votre bucket R2 contenant les épisodes audio numérotés (ex: *_episode1.m4a, *_episode2.m4a...)
            </Text>
            
            <View style={styles.r2FolderRow}>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={r2Folder}
                  onValueChange={handleSelectR2Folder}
                  style={styles.picker}
                  dropdownIconColor={colors.text.secondary}
                >
                  <Picker.Item label="Sélectionnez un dossier R2" value="" />
                  {r2Folders.map((f) => (
                    <Picker.Item key={f} label={f} value={f} />
                  ))}
                </Picker>
              </View>
            </View>

            {r2Folder && (
              <TouchableOpacity
                style={[styles.syncBtn, syncing && styles.syncBtnDisabled]}
                onPress={handleSyncR2}
                disabled={syncing || !isEdit}
              >
                {syncing ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <Ionicons name="sync" size={18} color="#000" />
                    <Text style={styles.syncBtnText}>
                      {isEdit ? 'Synchroniser avec R2' : 'Enregistrez d\'abord le cours'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {r2Folder && r2Files.length > 0 && (
              <View style={styles.r2FilesPreview}>
                <Text style={styles.r2FilesTitle}>
                  {r2Files.length} fichier(s) dans "{r2Folder}/"
                </Text>
                {r2Files.slice(0, 5).map((f) => (
                  <Text key={f.key} style={styles.r2FileItem}>
                    • {f.filename} ({f.size_mb} MB)
                  </Text>
                ))}
                {r2Files.length > 5 && (
                  <Text style={styles.r2FileItem}>... et {r2Files.length - 5} autres</Text>
                )}
              </View>
            )}

            {episodes.length > 0 && (
              <View style={styles.episodesSection}>
                <Text style={styles.episodesTitle}>
                  <Ionicons name="list" size={16} color={colors.text.secondary} /> {episodes.length} Épisode(s) liés
                </Text>
                {episodes.map((ep) => (
                  <View key={ep.id} style={styles.episodeItem}>
                    <Ionicons name="musical-note" size={14} color={colors.brand.primary} />
                    <Text style={styles.episodeText} numberOfLines={1}>
                      Ep. {ep.episode_number}: {ep.title}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Hero "À la une" Section */}
          <View style={[styles.r2Section, { marginTop: 8 }]}>
            <Text style={styles.r2Title}>
              <Ionicons name="star-outline" size={18} color="#C9A84C" /> Texte "À la une" (optionnel)
            </Text>
            <Text style={styles.r2Hint}>
              Si ce cours est mis en avant sur la page d'accueil, vous pouvez définir un titre et une description personnalisés qui remplaceront le titre et la description par défaut.
            </Text>

            <Text style={styles.label}>Titre héro (ex : "La Falsafa — Philosophie de l'Islam classique")</Text>
            <TextInput
              style={styles.input}
              value={heroTitle}
              onChangeText={setHeroTitle}
              placeholder="Titre personnalisé pour la page d'accueil"
              placeholderTextColor={colors.text.tertiary}
            />

            <Text style={styles.label}>Description héro (ex : "D'Al-Kindī à Averroès, sept siècles...")</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={heroDescription}
              onChangeText={setHeroDescription}
              placeholder="Description personnalisée pour la page d'accueil"
              placeholderTextColor={colors.text.tertiary}
              multiline
              numberOfLines={3}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="#000" />
                <Text style={styles.saveBtnText}>{isEdit ? 'Mettre à jour' : 'Créer'}</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },
  scroll: { flex: 1, paddingHorizontal: spacing.lg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: colors.text.primary,
    marginVertical: spacing.md,
  },
  label: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  picker: {
    color: colors.text.primary,
  },
  r2Section: {
    marginTop: spacing.xl,
    backgroundColor: colors.background.card,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.brand.primary + '30',
  },
  r2Title: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: colors.brand.primary,
    marginBottom: spacing.xs,
  },
  r2Hint: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: colors.text.tertiary,
    marginBottom: spacing.md,
  },
  r2FolderRow: {
    marginBottom: spacing.sm,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  syncBtnDisabled: { opacity: 0.6 },
  syncBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#000',
  },
  r2FilesPreview: {
    marginTop: spacing.md,
    backgroundColor: colors.background.elevated,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  r2FilesTitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  r2FileItem: {
    fontFamily: 'DMSans-Regular',
    fontSize: 11,
    color: colors.text.tertiary,
    marginBottom: 2,
  },
  episodesSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  episodesTitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  episodeText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: colors.text.primary,
    flex: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: radius.full,
    padding: spacing.md,
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#000',
  },
});
