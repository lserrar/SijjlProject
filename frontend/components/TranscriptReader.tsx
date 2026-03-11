import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest, useAuth } from '../../context/AuthContext';
import Markdown from 'react-native-markdown-display';

interface TranscriptReaderProps {
  audioId: string;
  cursusColor?: string;
  onClose: () => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  currentPosition?: number;
  duration?: number;
}

interface TranscriptData {
  has_transcript: boolean;
  title?: string;
  content?: string;
  sections?: { title: string; content: string }[];
  word_count?: number;
  reading_time_minutes?: number;
}

export default function TranscriptReader({
  audioId,
  cursusColor = '#04D182',
  onClose,
  isPlaying = false,
  onTogglePlay,
  currentPosition = 0,
  duration = 0,
}: TranscriptReaderProps) {
  const { token } = useAuth();
  const [transcript, setTranscript] = useState<TranscriptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(18);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadTranscript();
  }, [audioId]);

  const loadTranscript = async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await apiRequest(`/audios/${audioId}/transcript`, token);
      const data = await resp.json();
      setTranscript(data);
    } catch (e: any) {
      setError('Impossible de charger le texte');
      console.error('Transcript load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const increaseFontSize = () => setFontSize(prev => Math.min(prev + 2, 28));
  const decreaseFontSize = () => setFontSize(prev => Math.max(prev - 2, 14));

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentPosition / duration) * 100 : 0;

  // Custom markdown styles
  const markdownStyles = {
    body: {
      color: '#F5F0E8',
      fontSize: fontSize,
      fontFamily: 'EB Garamond',
      lineHeight: fontSize * 1.8,
    },
    heading1: {
      color: cursusColor,
      fontSize: fontSize + 8,
      fontFamily: 'Cinzel',
      fontWeight: '600' as const,
      marginTop: 24,
      marginBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: `${cursusColor}33`,
      paddingBottom: 8,
    },
    heading2: {
      color: '#F5F0E8',
      fontSize: fontSize + 4,
      fontFamily: 'Cinzel',
      fontWeight: '500' as const,
      marginTop: 28,
      marginBottom: 12,
    },
    heading3: {
      color: '#CCCCCC',
      fontSize: fontSize + 2,
      fontFamily: 'Cinzel',
      marginTop: 20,
      marginBottom: 8,
    },
    paragraph: {
      marginBottom: 16,
      textAlign: 'justify' as const,
    },
    strong: {
      color: cursusColor,
      fontWeight: '600' as const,
    },
    em: {
      fontStyle: 'italic' as const,
    },
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={cursusColor} />
          <Text style={styles.loadingText}>Chargement du texte...</Text>
        </View>
      </View>
    );
  }

  if (error || !transcript?.has_transcript) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color="#F5F0E8" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mode Lecture</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="document-text-outline" size={64} color="#444" />
          <Text style={styles.errorText}>
            {error || 'Pas de texte disponible pour cet épisode'}
          </Text>
          <TouchableOpacity style={[styles.backBtn, { borderColor: cursusColor }]} onPress={onClose}>
            <Text style={[styles.backBtnText, { color: cursusColor }]}>Retour à l'écoute</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="headset-outline" size={22} color="#F5F0E8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mode Lecture</Text>
        <View style={styles.fontControls}>
          <TouchableOpacity style={styles.fontBtn} onPress={decreaseFontSize}>
            <Text style={styles.fontBtnText}>A-</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fontBtn} onPress={increaseFontSize}>
            <Text style={styles.fontBtnText}>A+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Reading info */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Ionicons name="time-outline" size={14} color="#888" />
          <Text style={styles.infoText}>{transcript.reading_time_minutes} min de lecture</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="document-text-outline" size={14} color="#888" />
          <Text style={styles.infoText}>{transcript.word_count?.toLocaleString()} mots</Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView 
        ref={scrollRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
      >
        <Markdown style={markdownStyles}>
          {transcript.content || ''}
        </Markdown>
        
        {/* End of text marker */}
        <View style={styles.endMarker}>
          <View style={[styles.endLine, { backgroundColor: cursusColor }]} />
          <Text style={styles.endText}>Fin du texte</Text>
          <View style={[styles.endLine, { backgroundColor: cursusColor }]} />
        </View>
      </ScrollView>

      {/* Floating audio player */}
      <View style={styles.floatingPlayer}>
        <TouchableOpacity style={styles.playerPlayBtn} onPress={onTogglePlay}>
          <Ionicons 
            name={isPlaying ? 'pause' : 'play'} 
            size={20} 
            color="#0A0A0A" 
            style={{ marginLeft: isPlaying ? 0 : 2 }}
          />
        </TouchableOpacity>
        <View style={styles.playerProgress}>
          <View style={styles.playerProgressTrack}>
            <View 
              style={[
                styles.playerProgressFill, 
                { width: `${progress}%`, backgroundColor: cursusColor }
              ]} 
            />
          </View>
          <View style={styles.playerTimeRow}>
            <Text style={styles.playerTime}>{formatTime(currentPosition)}</Text>
            <Text style={styles.playerTime}>{formatTime(duration)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  closeBtn: {
    padding: 8,
  },
  headerTitle: {
    color: '#F5F0E8',
    fontSize: 16,
    fontFamily: 'Cinzel',
    letterSpacing: 1,
  },
  fontControls: {
    flexDirection: 'row',
    gap: 8,
  },
  fontBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#1A1A1A',
  },
  fontBtnText: {
    color: '#F5F0E8',
    fontSize: 14,
    fontWeight: '600',
  },
  placeholder: {
    width: 60,
  },
  infoBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 10,
    backgroundColor: '#111',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    color: '#888',
    fontSize: 12,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 120,
  },
  endMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 20,
    gap: 12,
  },
  endLine: {
    height: 1,
    width: 40,
    opacity: 0.5,
  },
  endText: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'Cinzel',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  floatingPlayer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#222',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(20px)' } : {}),
  },
  playerPlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerProgress: {
    flex: 1,
  },
  playerProgressTrack: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  playerProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  playerTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  playerTime: {
    color: '#888',
    fontSize: 11,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  errorText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  backBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
