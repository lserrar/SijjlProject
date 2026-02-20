import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Pressable,
} from 'react-native';
import { colors, radius, spacing, typography } from '../constants/theme';
import {
  formatDuration,
  formatCourseDuration,
  getLevelColor,
  getTypeLabel,
  Course,
  AudioContent,
  Article,
} from '../constants/mockData';
import { Ionicons } from '@expo/vector-icons';

type ContentItem = Course | AudioContent | Article;

interface ContentCardProps {
  item: ContentItem;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
  showProgress?: boolean;
  progress?: number;
  testID?: string;
}

export function ContentCard({ item, onPress, size = 'medium', showProgress, progress = 0, testID }: ContentCardProps) {
  const isAudio = item.type === 'podcast' || item.type === 'lecture' || item.type === 'quran' || item.type === 'documentary';
  const isCourse = item.type === 'course';
  const isArticle = item.type === 'article';

  const cardWidth = size === 'small' ? 140 : size === 'large' ? 280 : 160;
  const imgHeight = size === 'small' ? 100 : size === 'large' ? 160 : 110;

  const thumbnail = (item as any).thumbnail;
  const durationStr = isCourse
    ? formatCourseDuration((item as Course).duration)
    : isAudio
    ? formatDuration((item as AudioContent).duration)
    : `${(item as Article).reading_time} min`;

  return (
    <Pressable
      testID={testID || `content-card-${item.id}`}
      style={[styles.card, { width: cardWidth }]}
      onPress={onPress}
    >
      <View style={{ position: 'relative' }}>
        <Image
          source={{ uri: thumbnail }}
          style={[styles.image, { height: imgHeight }]}
          resizeMode="cover"
        />
        {/* Type badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{getTypeLabel(item.type)}</Text>
        </View>
        {/* Play overlay for audio/course */}
        {(isAudio || isCourse) && (
          <View style={styles.playOverlay}>
            <View style={styles.playButton}>
              <Ionicons name="play" size={14} color="#000" />
            </View>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.scholar} numberOfLines={1}>
          {(item as any).scholar_name}
        </Text>

        <View style={styles.meta}>
          {isCourse && (
            <View style={[styles.levelBadge, { borderColor: getLevelColor((item as Course).level) }]}>
              <Text style={[styles.levelText, { color: getLevelColor((item as Course).level) }]}>
                {(item as Course).level}
              </Text>
            </View>
          )}
          <Text style={styles.duration}>
            <Ionicons name="time-outline" size={10} color={colors.text.tertiary} /> {durationStr}
          </Text>
        </View>

        {showProgress && progress > 0 && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

interface ScholarCardProps {
  scholar: any;
  onPress?: () => void;
  compact?: boolean;
  testID?: string;
}

export function ScholarCard({ scholar, onPress, compact = false, testID }: ScholarCardProps) {
  if (compact) {
    return (
      <Pressable testID={testID || `scholar-card-${scholar.id}`} style={styles.scholarCompact} onPress={onPress}>
        <Image source={{ uri: scholar.photo }} style={styles.scholarPhotoSmall} />
        <View style={styles.scholarInfo}>
          <Text style={styles.scholarNameSmall} numberOfLines={1}>{scholar.name}</Text>
          <Text style={styles.scholarUni} numberOfLines={1}>{scholar.university}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
      </Pressable>
    );
  }

  return (
    <Pressable
      testID={testID || `scholar-card-${scholar.id}`}
      style={styles.scholarCard}
      onPress={onPress}
    >
      <Image source={{ uri: scholar.photo }} style={styles.scholarPhoto} />
      <View style={styles.scholarOverlay}>
        <Text style={styles.scholarName}>{scholar.name}</Text>
        <Text style={styles.scholarUniLarge} numberOfLines={1}>{scholar.university}</Text>
        <View style={styles.scholarTags}>
          {scholar.specializations?.slice(0, 2).map((spec: string) => (
            <View key={spec} style={styles.specTag}>
              <Text style={styles.specText}>{spec}</Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginRight: spacing.sm,
  },
  image: {
    width: '100%',
    backgroundColor: colors.background.elevated,
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontFamily: 'Inter-Medium',
    fontSize: 9,
    color: colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  playOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  playButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    padding: 10,
  },
  title: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.text.primary,
    lineHeight: 17,
    marginBottom: 4,
  },
  scholar: {
    fontFamily: 'DMSans-Regular',
    fontSize: 11,
    color: colors.text.secondary,
    marginBottom: 6,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  levelBadge: {
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  levelText: {
    fontFamily: 'Inter-Medium',
    fontSize: 9,
  },
  duration: {
    fontFamily: 'DMSans-Regular',
    fontSize: 10,
    color: colors.text.tertiary,
  },
  progressBar: {
    height: 2,
    backgroundColor: colors.border.default,
    borderRadius: 1,
    marginTop: 6,
  },
  progressFill: {
    height: 2,
    backgroundColor: colors.brand.primary,
    borderRadius: 1,
  },
  // Scholar Card
  scholarCard: {
    width: 220,
    height: 160,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginRight: spacing.sm,
    backgroundColor: colors.background.card,
  },
  scholarPhoto: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  scholarOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  scholarName: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: 2,
  },
  scholarUniLarge: {
    fontFamily: 'DMSans-Regular',
    fontSize: 11,
    color: colors.brand.secondary,
    marginBottom: 6,
  },
  scholarTags: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  specTag: {
    backgroundColor: 'rgba(4, 209, 130, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  specText: {
    fontFamily: 'Inter-Medium',
    fontSize: 9,
    color: colors.brand.primary,
  },
  // Compact Scholar
  scholarCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background.card,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  scholarPhotoSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.elevated,
  },
  scholarInfo: {
    flex: 1,
  },
  scholarNameSmall: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: 2,
  },
  scholarUni: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: colors.text.secondary,
  },
});
