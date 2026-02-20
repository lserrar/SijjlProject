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

export default function CourseForm() {
  const { token } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [scholars, setScholars] = useState<Scholar[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scholarId, setScholarId] = useState('');
  const [scholarName, setScholarName] = useState('');
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('D\u00e9butant');
  const [language, setLanguage] = useState('Fran\u00e7ais');
  const [duration, setDuration] = useState('0');
  const [modulesCount, setModulesCount] = useState('0');
  const [thumbnail, setThumbnail] = useState('');
  const [tags, setTags] = useState('');

  const TOPICS = ['Philosophie islamique', 'Tasawwuf', 'Fiqh', 'Histoire de l\'Islam', 'Sciences coraniques', 'Kalam'];
  const LEVELS = ['D\u00e9butant', 'Interm\u00e9diaire', 'Avanc\u00e9'];
  const LANGUAGES = ['Fran\u00e7ais', 'Arabe', 'Anglais'];

  useEffect(() => {
    loadScholars();
    if (isEdit) loadCourse();
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
        setLevel(data.level || 'D\u00e9butant');
        setLanguage(data.language || 'Fran\u00e7ais');
        setDuration(String(data.duration || 0));
        setModulesCount(String(data.modules_count || 0));
        setThumbnail(data.thumbnail || '');
        setTags((data.tags || []).join(', '));
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de charger le cours');
    } finally {
      setLoading(false);
    }
  };

  const handleScholarChange = (newId: string) => {
    setScholarId(newId);
    const scholar = scholars.find((s) => s.id === newId);
    if (scholar) setScholarName(scholar.name);
  };

  const handleSave = async () => {
    if (!title.trim() || !scholarId || !topic) {
      Alert.alert('Champs requis', 'Veuillez remplir le titre, l\'\u00e9rudit et le sujet.');
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
        duration: parseInt(duration) || 0,
        modules_count: parseInt(modulesCount) || 0,
        thumbnail: thumbnail.trim() || 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=600&q=80',
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      };

      const endpoint = isEdit ? `/admin/courses/${id}` : '/admin/courses';
      const method = isEdit ? 'PUT' : 'POST';

      const resp = await apiRequest(endpoint, token, {
        method,
        body: JSON.stringify(body),
      });

      if (resp.ok) {
        Alert.alert('Succ\u00e8s', isEdit ? 'Cours mis \u00e0 jour' : 'Cours cr\u00e9\u00e9', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        const err = await resp.json();
        Alert.alert('Erreur', err.detail || 'Op\u00e9ration \u00e9chou\u00e9e');
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

          <Text style={styles.label}>\u00c9rudit *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={scholarId}
              onValueChange={handleScholarChange}
              style={styles.picker}
              dropdownIconColor={colors.text.secondary}
            >
              <Picker.Item label="S\u00e9lectionnez un \u00e9rudit" value="" />
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
              <Picker.Item label="S\u00e9lectionnez un sujet" value="" />
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

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Dur\u00e9e (min)</Text>
              <TextInput
                style={styles.input}
                value={duration}
                onChangeText={setDuration}
                placeholder="0"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Nb modules</Text>
              <TextInput
                style={styles.input}
                value={modulesCount}
                onChangeText={setModulesCount}
                placeholder="0"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="numeric"
              />
            </View>
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

          <Text style={styles.label}>Tags (s\u00e9par\u00e9s par des virgules)</Text>
          <TextInput
            style={styles.input}
            value={tags}
            onChangeText={setTags}
            placeholder="Philosophie, Avicenne, M\u00e9taphysique"
            placeholderTextColor={colors.text.tertiary}
          />

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
                <Text style={styles.saveBtnText}>{isEdit ? 'Mettre \u00e0 jour' : 'Cr\u00e9er'}</Text>
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
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
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
