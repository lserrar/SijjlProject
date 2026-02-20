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

interface Scholar {
  id: string;
  name: string;
  university: string;
  bio: string;
  photo: string;
  specializations: string[];
  content_count: number;
  is_active?: boolean;
}

export default function AdminScholars() {
  const { token } = useAuth();
  const router = useRouter();
  const [scholars, setScholars] = useState<Scholar[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadScholars = useCallback(async () => {
    try {
      const resp = await apiRequest('/admin/scholars', token);
      if (resp.ok) {
        const data = await resp.json();
        setScholars(data);
      }
    } catch (e) {
      console.error('Failed to load scholars', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadScholars();
  }, [loadScholars]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadScholars();
  };

  const handleDelete = (scholarId: string, name: string) => {
    Alert.alert(
      'Supprimer cet érudit ?',
      `"${name}" sera définitivement supprimé. Cette action pourrait affecter les cours et audios associés.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const resp = await apiRequest(`/admin/scholars/${scholarId}`, token, { method: 'DELETE' });
              if (resp.ok) {
                setScholars((prev) => prev.filter((s) => s.id !== scholarId));
              }
            } catch (e) {
              Alert.alert('Erreur', 'Suppression échouée');
            }
          },
        },
      ]
    );
  };

  const renderScholar = ({ item }: { item: Scholar }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.photo }} style={styles.photo} />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardUniversity} numberOfLines={1}>{item.university}</Text>
        <View style={styles.specRow}>
          {item.specializations.slice(0, 2).map((spec) => (
            <View key={spec} style={styles.specTag}>
              <Text style={styles.specText}>{spec}</Text>
            </View>
          ))}
          {item.specializations.length > 2 && (
            <Text style={styles.moreSpecs}>+{item.specializations.length - 2}</Text>
          )}
        </View>
        <Text style={styles.contentCount}>{item.content_count} contenus</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push({ pathname: '/admin/scholar-form', params: { id: item.id } })}
        >
          <Ionicons name="create-outline" size={20} color={colors.brand.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id, item.name)}>
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
        data={scholars}
        keyExtractor={(item) => item.id}
        renderItem={renderScholar}
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
            <Text style={styles.headerCount}>{scholars.length} érudits</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => router.push('/admin/scholar-form')}
            >
              <Ionicons name="add" size={20} color="#000" />
              <Text style={styles.addBtnText}>Ajouter</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="school-outline" size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>Aucun érudit</Text>
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
  photo: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.background.elevated,
  },
  cardContent: { flex: 1, justifyContent: 'center' },
  cardTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.text.primary, marginBottom: 2 },
  cardUniversity: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.text.secondary, marginBottom: 4 },
  specRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 4 },
  specTag: {
    backgroundColor: colors.brand.primary + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  specText: { fontFamily: 'DMSans-Regular', fontSize: 10, color: colors.brand.primary },
  moreSpecs: { fontFamily: 'DMSans-Regular', fontSize: 10, color: colors.text.tertiary },
  contentCount: { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.text.tertiary },
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
