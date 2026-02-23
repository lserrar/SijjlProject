import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, apiRequest } from '../context/AuthContext';
import { colors, spacing, radius } from '../constants/theme';
import { formatDuration } from '../constants/mockData';

export default function SearchScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ audios: any[]; courses: any[] }>({ audios: [], courses: [] });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      inputRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults({ audios: [], courses: [] });
      setSearched(false);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const resp = await apiRequest(`/search?q=${encodeURIComponent(query.trim())}`, token);
        if (resp.ok) {
          const data = await resp.json();
          setResults(data);
          setSearched(true);
        }
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query, token]);

  const total = (results.audios?.length || 0) + (results.courses?.length || 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <TouchableOpacity testID="search-back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.inputWrap}>
          <Ionicons name="search" size={18} color={colors.text.secondary} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            testID="search-input"
            style={styles.input}
            placeholder="Rechercher un épisode, un cours..."
            placeholderTextColor={colors.text.secondary}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity testID="search-clear-btn" onPress={() => setQuery('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={colors.brand.primary} />
        </View>
      )}

      {!loading && !searched && !query && (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={52} color="rgba(255,255,255,0.1)" />
          <Text style={styles.emptyTitle}>Rechercher dans le catalogue</Text>
          <Text style={styles.emptySubtitle}>Épisodes, cours, professeurs...</Text>
        </View>
      )}

      {!loading && searched && total === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={48} color="rgba(255,255,255,0.1)" />
          <Text style={styles.emptyTitle}>Aucun résultat</Text>
          <Text style={styles.emptySubtitle}>Essayez avec d'autres mots-clés</Text>
        </View>
      )}

      {!loading && total > 0 && (
        <ScrollView style={styles.results} showsVerticalScrollIndicator={false}>
          {/* Episodes */}
          {results.audios?.length > 0 && (
            <View>
              <Text style={styles.groupTitle}>
                Épisodes
                <Text style={styles.groupCount}> ({results.audios.length})</Text>
              </Text>
              {results.audios.map((audio: any) => (
                <TouchableOpacity
                  key={audio.id}
                  testID={`search-audio-${audio.id}`}
                  style={styles.resultRow}
                  onPress={() => router.push(`/audio/${audio.id}` as any)}
                >
                  <Image
                    source={{ uri: audio.thumbnail || 'https://via.placeholder.com/56x56' }}
                    style={styles.resultThumb}
                  />
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultTitle} numberOfLines={2}>{audio.title}</Text>
                    <Text style={styles.resultMeta}>{audio.scholar_name}</Text>
                    {audio.duration > 0 && (
                      <Text style={styles.resultDuration}>{formatDuration(audio.duration)}</Text>
                    )}
                  </View>
                  <View style={styles.playIcon}>
                    <Ionicons name="play" size={14} color={colors.brand.primary} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Courses */}
          {results.courses?.length > 0 && (
            <View style={styles.coursesGroup}>
              <Text style={styles.groupTitle}>
                Cours
                <Text style={styles.groupCount}> ({results.courses.length})</Text>
              </Text>
              {results.courses.map((course: any) => (
                <TouchableOpacity
                  key={course.id}
                  testID={`search-course-${course.id}`}
                  style={styles.resultRow}
                  onPress={() => router.push(`/course/${course.id}` as any)}
                >
                  <Image
                    source={{ uri: course.thumbnail || 'https://via.placeholder.com/56x56' }}
                    style={styles.resultThumb}
                  />
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultTitle} numberOfLines={2}>{course.title}</Text>
                    <Text style={styles.resultMeta}>{course.scholar_name}</Text>
                    {course.modules_count > 0 && (
                      <Text style={styles.resultDuration}>{course.modules_count} épisodes</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#080808' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: spacing.sm,
  },
  backBtn: { padding: 6 },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  input: {
    flex: 1,
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    color: colors.text.primary,
    paddingVertical: 0,
    outlineStyle: 'none',
  } as any,
  clearBtn: { marginLeft: 6 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: 'Cinzel',
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    marginTop: spacing.md,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  emptySubtitle: {
    fontFamily: 'EB Garamond',
    fontStyle: 'italic',
    fontSize: 15,
    color: '#444444',
    textAlign: 'center',
  },

  results: { flex: 1 },

  groupTitle: {
    fontFamily: 'Cinzel',
    fontSize: 9,
    color: '#04D182',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 5,
  },
  groupCount: { fontFamily: 'EB Garamond', fontStyle: 'italic', color: '#888888', fontSize: 13 },
  coursesGroup: { marginTop: spacing.md },

  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  resultThumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.background.card,
  },
  resultInfo: { flex: 1 },
  resultTitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 19,
  },
  resultMeta: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: colors.brand.primary,
    marginTop: 2,
  },
  resultDuration: {
    fontFamily: 'DMSans-Regular',
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 2,
  },
  playIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
