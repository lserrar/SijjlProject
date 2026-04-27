// 7 cursus: A=Histoire, B=Théologie, C=Sciences islamiques, D=Arts,
// E=Falsafa, F=Mystique, G=Pensées non-islamiques
export const CURSUS_COLORS = {
  'cursus-histoire': '#D97757',
  'cursus-theologie': '#8B5CF6',
  'cursus-sciences-islamiques': '#EAD637',
  'cursus-arts': '#EC4899',
  'cursus-falsafa': '#04D182',
  'cursus-spiritualites': '#06B6D4',
  'cursus-pensees-non-islamiques': '#F59E0B',
};

export const CURSUS_LETTERS = {
  'cursus-histoire': 'A',
  'cursus-theologie': 'B',
  'cursus-sciences-islamiques': 'C',
  'cursus-arts': 'D',
  'cursus-falsafa': 'E',
  'cursus-spiritualites': 'F',
  'cursus-pensees-non-islamiques': 'G',
};

export function getCursusColor(id) {
  return CURSUS_COLORS[id] || '#04D182';
}

export function getCursusLetter(id) {
  return CURSUS_LETTERS[id] || '?';
}

export function formatDuration(seconds) {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Extract YouTube video ID from any YouTube URL format
export function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|watch\?v=|v\/))([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// Build a privacy-enhanced (youtube-nocookie) embed URL with minimal branding
export function buildYouTubeEmbedUrl(url) {
  const id = extractYouTubeId(url);
  if (!id) return null;
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    iv_load_policy: '3',
    showinfo: '0',
    playsinline: '1',
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}
