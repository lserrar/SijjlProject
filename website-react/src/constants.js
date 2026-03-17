export const CURSUS_COLORS = {
  'cursus-falsafa': '#04D182',
  'cursus-theologie': '#8B5CF6',
  'cursus-sciences-islamiques': '#EAD637',
  'cursus-arts': '#EC4899',
  'cursus-spiritualites': '#06B6D4',
  'cursus-pensees-non-islamiques': '#F59E0B',
};

export const CURSUS_LETTERS = {
  'cursus-falsafa': 'A',
  'cursus-theologie': 'B',
  'cursus-sciences-islamiques': 'C',
  'cursus-arts': 'D',
  'cursus-spiritualites': 'E',
  'cursus-pensees-non-islamiques': 'F',
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
