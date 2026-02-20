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

export default function ScholarForm() {
  const { token } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [university, setUniversity] = useState('');
  const [bio, setBio] = useState('');
  const [photo, setPhoto] = useState('');
  const [specializations, setSpecializations] = useState('');

  useEffect(() => {
    if (isEdit) loadScholar();
  }, [id]);

  const loadScholar = async () => {
    try {
      const resp = await apiRequest(`/scholars/${id}`, token);
      if (resp.ok) {
        const data = await resp.json();
        setName(data.name || '');
        setUniversity(data.university || '');
        setBio(data.bio || '');
        setPhoto(data.photo || '');
        setSpecializations((data.specializations || []).join(', '));
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de charger l\'\u00e9rudit');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !university.trim()) {
      Alert.alert('Champs requis', 'Veuillez remplir le nom et l\'universit\u00e9.');
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        university: university.trim(),
        bio: bio.trim(),
        photo: photo.trim() || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
        specializations: specializations.split(',').map((s) => s.trim()).filter(Boolean),
      };

      const endpoint = isEdit ? `/admin/scholars/${id}` : '/admin/scholars';
      const method = isEdit ? 'PUT' : 'POST';

      const resp = await apiRequest(endpoint, token, {
        method,
        body: JSON.stringify(body),
      });

      if (resp.ok) {
        Alert.alert('Succ\u00e8s', isEdit ? '\u00c9rudit mis \u00e0 jour' : '\u00c9rudit cr\u00e9\u00e9', [
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
          <Text style={styles.sectionTitle}>{isEdit ? 'Modifier l\'\u00e9rudit' : 'Nouvel \u00e9rudit'}</Text>

          <Text style={styles.label}>Nom *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Prof. Jean Dupont"
            placeholderTextColor={colors.text.tertiary}
          />

          <Text style={styles.label}>Universit\u00e9 / Institution *</Text>
          <TextInput
            style={styles.input}
            value={university}
            onChangeText={setUniversity}
            placeholder="Universit\u00e9 Paris-Sorbonne"
            placeholderTextColor={colors.text.tertiary}
          />

          <Text style={styles.label}>Biographie</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Biographie de l'\u00e9rudit..."
            placeholderTextColor={colors.text.tertiary}
            multiline
            numberOfLines={6}
          />

          <Text style={styles.label}>URL de la photo</Text>
          <TextInput
            style={styles.input}
            value={photo}
            onChangeText={setPhoto}
            placeholder="https://..."
            placeholderTextColor={colors.text.tertiary}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Sp\u00e9cialisations (s\u00e9par\u00e9es par des virgules)</Text>
          <TextInput
            style={styles.input}
            value={specializations}
            onChangeText={setSpecializations}
            placeholder="Philosophie, Th\u00e9ologie, Soufisme"
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
    minHeight: 140,
    textAlignVertical: 'top',
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
