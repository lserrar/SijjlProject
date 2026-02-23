// Types for the Le Sijill app

export interface Scholar {
  id: string;
  name: string;
  university: string;
  bio: string;
  photo: string;
  specializations: string[];
  content_count: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  topic: string;
  level: 'Débutant' | 'Intermédiaire' | 'Avancé';
  language: string;
  scholar_id: string;
  scholar_name: string;
  duration: number; // minutes
  thumbnail: string;
  modules_count: number;
  tags: string[];
  type: 'course';
  published_at: string;
}

export interface AudioContent {
  id: string;
  title: string;
  description: string;
  scholar_id: string;
  scholar_name: string;
  duration: number; // seconds
  audio_url: string;
  thumbnail: string;
  topic: string;
  type: 'podcast' | 'lecture' | 'quran' | 'documentary';
  published_at: string;
}

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  scholar_id: string;
  scholar_name: string;
  reading_time: number; // minutes
  thumbnail: string;
  topic: string;
  published_at: string;
  type: 'article';
}

export interface LiveSession {
  id: string;
  title: string;
  description: string;
  scholar_id: string;
  scholar_name: string;
  date: string; // ISO date string
  duration: number; // minutes
  thumbnail: string;
  topic: string;
  max_participants: number;
  registered_count: number;
  registered_users?: string[];
  is_registered?: boolean;
}

export interface UserProgress {
  user_id: string;
  content_id: string;
  content_type: string;
  progress: number; // 0.0 to 1.0
  position: number; // seconds
  updated_at: string;
  completed: boolean;
}

export interface FavoriteItem {
  favorite: {
    content_id: string;
    content_type: string;
    saved_at: string;
  };
  content: Course | AudioContent | Article;
}

export type ContentItem = Course | AudioContent | Article;

export type ContentType = 'course' | 'audio' | 'article' | 'podcast' | 'lecture' | 'quran' | 'documentary';

export const TOPICS = [
  'Philosophie islamique',
  'Tasawwuf',
  'Fiqh',
  'Histoire de l\'Islam',
  'Sciences coraniques',
  'Kalam',
];

export const LEVELS = ['Débutant', 'Intermédiaire', 'Avancé'];

export const CONTENT_TYPES = [
  { key: 'all', label: 'Tout' },
  { key: 'course', label: 'Cours' },
  { key: 'podcast', label: 'Podcasts' },
  { key: 'lecture', label: 'Conférences' },
  { key: 'quran', label: 'Récitations' },
  { key: 'article', label: 'Articles' },
];

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min`;
  return `${s}s`;
}

export function formatCourseDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatSessionDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatSessionTime(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function getLevelColor(level: string): string {
  switch (level) {
    case 'Débutant': return '#04D182';
    case 'Intermédiaire': return '#FFC107';
    case 'Avancé': return '#CF6679';
    default: return '#B3B3B3';
  }
}

export function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    podcast: 'Podcast',
    lecture: 'Conférence',
    quran: 'Récitation',
    documentary: 'Documentaire',
    course: 'Cours',
    article: 'Article',
  };
  return labels[type] || type;
}

export function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    podcast: 'mic',
    lecture: 'school',
    quran: 'book',
    documentary: 'film',
    course: 'play-circle',
    article: 'file-text',
    quran_recitation: 'book',
    film: 'film',
  };
  return icons[type] || 'play';
}
