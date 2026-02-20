import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { usePlayer } from '../context/PlayerContext';
import { colors, MINI_PLAYER_HEIGHT } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function MiniPlayer() {
  const { currentTrack, isPlaying, position, duration, togglePlayPause, stopTrack } = usePlayer();
  const router = useRouter();

  if (!currentTrack) return null;

  const progress = duration > 0 ? position / duration : 0;

  return (
    <Pressable
      testID="mini-player"
      style={styles.container}
      onPress={() => router.push(`/audio/${currentTrack.id}` as any)}
    >
      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <View style={styles.content}>
        {/* Thumbnail */}
        <Image
          source={{ uri: currentTrack.thumbnail }}
          style={styles.thumbnail}
          resizeMode="cover"
        />

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text style={styles.scholar} numberOfLines={1}>
            {currentTrack.scholar_name}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            testID="mini-player-play-pause"
            style={styles.controlBtn}
            onPress={togglePlayPause}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={24}
              color={colors.text.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            testID="mini-player-close"
            style={styles.controlBtn}
            onPress={stopTrack}
          >
            <Ionicons name="close" size={22} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: MINI_PLAYER_HEIGHT,
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  progressBar: {
    height: 2,
    backgroundColor: colors.border.default,
    width: '100%',
  },
  progressFill: {
    height: 2,
    backgroundColor: colors.brand.primary,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 4,
    backgroundColor: colors.background.card,
  },
  info: {
    flex: 1,
  },
  title: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: colors.text.primary,
    marginBottom: 2,
  },
  scholar: {
    fontFamily: 'DMSans-Regular',
    fontSize: 11,
    color: colors.text.secondary,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  controlBtn: {
    padding: 8,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
