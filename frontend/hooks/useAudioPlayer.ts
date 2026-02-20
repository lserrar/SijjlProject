import { useAuth, apiRequest } from '../context/AuthContext';
import { usePlayer, AudioTrack } from '../context/PlayerContext';

/**
 * Hook for playing audio content with automatic R2 presigned URL resolution.
 * Fetches a fresh presigned URL from the backend before each play.
 */
export function useAudioPlayer() {
  const { token } = useAuth();
  const { playTrack, currentTrack, isPlaying, togglePlayPause } = usePlayer();

  const play = async (audio: {
    id: string;
    title: string;
    scholar_name: string;
    thumbnail: string;
    audio_url?: string;
    stream_url?: string;
    type: string;
    duration?: number;
  }) => {
    try {
      // If already playing the same track, just toggle
      if (currentTrack?.id === audio.id) {
        await togglePlayPause();
        return;
      }

      // Fetch fresh presigned URL from backend (R2 or fallback)
      let streamUrl = audio.stream_url || audio.audio_url || '';
      try {
        const resp = await apiRequest(`/audios/${audio.id}/stream-url`, token);
        if (resp.ok) {
          const data = await resp.json();
          if (data.stream_url) streamUrl = data.stream_url;
        }
      } catch {
        // Use the URL already in the audio object if request fails
      }

      const track: AudioTrack = {
        id: audio.id,
        title: audio.title,
        scholar_name: audio.scholar_name,
        thumbnail: audio.thumbnail,
        audio_url: streamUrl,
        type: audio.type,
        duration: audio.duration,
      };

      await playTrack(track);
    } catch (e) {
      console.error('useAudioPlayer play error:', e);
      throw e;
    }
  };

  return { play, currentTrack, isPlaying };
}
