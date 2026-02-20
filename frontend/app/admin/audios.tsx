import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth, apiRequest } from '../../context/AuthContext';
import { colors, spacing, radius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface Audio {
  id: string;
  title: string;
  description: string;
  scholar_name: string;
  duration: number;
  thumbnail: string;
  topic: string;
  type: string;
  is_active: boolean;
  file_key?: string;
}

export default function AdminAudios() {
  const { token } = useAuth();
  const router = useRouter();
  const [audios, setAudios] = useState<Audio[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAudios = useCallback(async () => {
    try {
      const resp = await apiRequest('/admin/audios', token);
      if (resp.ok) {
        const data = await resp.json();
        setAudios(data);
      }
    } catch (e) {
      console.error('Failed to load audios', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadAudios();
  }, [loadAudios]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAudios();
  };

  const handleToggle = async (audioId: string) => {
    try {
      const resp = await apiRequest(`/admin/audios/${audioId}/toggle`, token, { method: 'PATCH' });
      if (resp.ok) {
        const result = await resp.json();
        setAudios((prev) =>
          prev.map((a) => (a.id === audioId ? { ...a, is_active: result.is_active } : a))
        );
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de changer le statut');
    }
  };

  const handleDelete = (audioId: string, title: string) => {
    Alert.alert(
      'Supprimer cet audio ?',
      `"${title}" sera définitivement supprimé.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const resp = await apiRequest(`/admin/audios/${audioId}`, token, { method: 'DELETE' });
              if (resp.ok) {
                setAudios((prev) => prev.filter((a) => a.id !== audioId));
              }
            } catch (e) {
              Alert.alert('Erreur', 'Suppression échouée');
            }
          },
        },
      ]
    );
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h${mins % 60}min`;
  };

  const renderAudio = ({ item }: { item: Audio }) => (
    <View style={[styles.card, !item.is_active && styles.cardInactive]}>
      <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.cardMeta}>
          {item.scholar_name} · {formatDuration(item.duration)}
        </Text>
        <View style={styles.tagRow}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{item.type}</Text>
          </View>
          <View style={[styles.statusTag, item.is_active ? styles.statusActive : styles.statusInactive]}>
            <Text style={[styles.statusText, item.is_active ? styles.statusTextActive : styles.statusTextInactive]}>
              {item.is_active ? 'Actif' : 'Inactif'}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push({ pathname: '/admin/audio-form', params: { id: item.id } })}
        >
          <Ionicons name="create-outline" size={20} color={colors.brand.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleToggle(item.id)}>
          <Ionicons
            name={item.is_active ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={item.is_active ? '#FFA500' : colors.brand.primary}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id, item.title)}>
          <Ionicons name="trash-outline" size={20} color={colors.brand.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

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
      <FlatList
        data={audios}
        keyExtractor={(item) => item.id}
        renderItem={renderAudio}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.brand.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerCount}>{audios.length} audios</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => router.push('/admin/audio-form')}
            >
              <Ionicons name="add" size={20} color="#000" />
              <Text style={styles.addBtnText}>Ajouter</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="musical-notes-outline" size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>Aucun audio</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerCount: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: colors.text.primary },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    gap: 4,
  },
  addBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#000' },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.background.card,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  cardInactive: { opacity: 0.6 },
  thumbnail: {
    width: 70,
    height: 70,
    borderRadius: radius.md,
    backgroundColor: colors.background.elevated,
  },
  cardContent: { flex: 1, justifyContent: 'center' },
  cardTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.text.primary, marginBottom: 2 },
  cardMeta: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.text.secondary, marginBottom: 4 },
  tagRow: { flexDirection: 'row', gap: spacing.xs },
  tag: {
    backgroundColor: colors.background.elevated,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  tagText: { fontFamily: 'DMSans-Regular', fontSize: 10, color: colors.text.secondary, textTransform: 'capitalize' },
  statusTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.sm },
  statusActive: { backgroundColor: colors.brand.primary + '20' },
  statusInactive: { backgroundColor: colors.brand.error + '20' },
  statusText: { fontFamily: 'DMSans-Medium', fontSize: 10 },
  statusTextActive: { color: colors.brand.primary },
  statusTextInactive: { color: colors.brand.error },
  cardActions: { justifyContent: 'center', gap: spacing.xs },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.elevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: spacing.md },
  emptyText: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.text.tertiary },
});
