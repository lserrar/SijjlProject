import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { apiRequest } from '../../context/AuthContext';
import { useAuth } from '../../context/AuthContext';
import { ContentCard } from '../../components/ContentCard';
import { colors, spacing, radius } from '../../constants/theme';
import { CONTENT_TYPES, TOPICS } from '../../constants/mockData';
import { Ionicons } from '@expo/vector-icons';

export default function ExplorerScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState('all');
  const [activeTopic, setActiveTopic] = useState('');
  const [courses, setCourses] = useState<any[]>([]);
  const [audios, setAudios] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const [coursesResp, audiosResp, articlesResp] = await Promise.all([
        apiRequest('/courses', token),
        apiRequest('/audios', token),
        apiRequest('/articles', token),
      ]);
      setCourses(await coursesResp.json());
      setAudios(await audiosResp.json());
      setArticles(await articlesResp.json());
    } catch (e) {
      console.error('Explorer fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const getAllItems = () => {
    let items: any[] = [];
    if (activeType === 'all' || activeType === 'course') items = [...items, ...courses];
    if (activeType === 'all' || activeType === 'podcast') items = [...items, ...audios.filter(a => a.type === 'podcast')];
    if (activeType === 'all' || activeType === 'lecture') items = [...items, ...audios.filter(a => a.type === 'lecture')];
    if (activeType === 'all' || activeType === 'quran') items = [...items, ...audios.filter(a => a.type === 'quran' || a.type === 'documentary')];
    if (activeType === 'all' || activeType === 'article') items = [...items, ...articles];

    if (activeTopic) {
      items = items.filter(item => item.topic === activeTopic);
    }

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(item =>
        item.title?.toLowerCase().includes(q) ||
        item.scholar_name?.toLowerCase().includes(q) ||
        item.topic?.toLowerCase().includes(q)
      );
    }

    return items;
  };

  const navigateToContent = (item: any) => {
    if (item.type === 'course') router.push(`/course/${item.id}` as any);
    else if (['podcast', 'lecture', 'quran', 'documentary'].includes(item.type)) router.push(`/audio/${item.id}` as any);
    else if (item.type === 'article') router.push(`/article/${item.id}` as any);
  };

  const items = getAllItems();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Explorer</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.text.tertiary} style={styles.searchIcon} />
        <TextInput
          testID="explorer-search-input"
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Chercher un cours, un érudit..."
          placeholderTextColor={colors.text.tertiary}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Content Type Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {CONTENT_TYPES.map(type => (
          <TouchableOpacity
            key={type.key}
            testID={`explorer-type-${type.key}`}
            style={[styles.filterChip, activeType === type.key && styles.filterChipActive]}
            onPress={() => setActiveType(type.key)}
          >
            <Text style={[styles.filterChipText, activeType === type.key && styles.filterChipTextActive]}>
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Topic Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={{ maxHeight: 44 }}
      >
        <TouchableOpacity
          testID="explorer-topic-all"
          style={[styles.topicChip, !activeTopic && styles.topicChipActive]}
          onPress={() => setActiveTopic('')}
        >
          <Text style={[styles.topicChipText, !activeTopic && styles.topicChipTextActive]}>Tous</Text>
        </TouchableOpacity>
        {TOPICS.map(topic => (
          <TouchableOpacity
            key={topic}
            testID={`explorer-topic-${topic}`}
            style={[styles.topicChip, activeTopic === topic && styles.topicChipActive]}
            onPress={() => setActiveTopic(activeTopic === topic ? '' : topic)}
          >
            <Text style={[styles.topicChipText, activeTopic === topic && styles.topicChipTextActive]}>
              {topic}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyText}>Aucun résultat trouvé</Text>
            </View>
          }
          ListFooterComponent={<View style={{ height: 100 }} />}
          renderItem={({ item }) => (
            <ContentCard
              item={item}
              onPress={() => navigateToContent(item)}
              size="small"
              testID={`explorer-item-${item.id}`}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.primary },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: { fontFamily: 'Inter-Bold', fontSize: 28, color: colors.text.primary, letterSpacing: -0.5 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    marginHorizontal: spacing.lg,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    height: 44,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  searchIcon: {},
  searchInput: { flex: 1, fontFamily: 'DMSans-Regular', fontSize: 15, color: colors.text.primary },
  filterScroll: { maxHeight: 50 },
  filterRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, alignItems: 'center', paddingVertical: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  filterChipActive: { backgroundColor: colors.text.primary, borderColor: colors.text.primary },
  filterChipText: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.text.secondary },
  filterChipTextActive: { color: colors.background.primary },
  topicChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginLeft: 8,
  },
  topicChipActive: { borderColor: colors.brand.primary },
  topicChipText: { fontFamily: 'Inter-Medium', fontSize: 12, color: colors.text.secondary },
  topicChipTextActive: { color: colors.brand.primary },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  grid: { padding: spacing.md },
  row: { justifyContent: 'space-between', marginBottom: spacing.sm },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontFamily: 'DMSans-Regular', fontSize: 15, color: colors.text.secondary },
});
