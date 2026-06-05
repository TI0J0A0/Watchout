export const GENRES = [
  // Special curated category — Isekai is MAL/Jikan theme id 62.
  { id: 62, name: 'Isekai Lovers', icon: '🌀', special: true },
  { id: 1, name: 'Action', icon: '⚔️' },
  { id: 2, name: 'Adventure', icon: '🗺️' },
  { id: 4, name: 'Comedy', icon: '😂' },
  { id: 8, name: 'Drama', icon: '🎭' },
  { id: 10, name: 'Fantasy', icon: '🔮' },
  { id: 14, name: 'Horror', icon: '👻' },
  { id: 7, name: 'Mystery', icon: '🔍' },
  { id: 22, name: 'Romance', icon: '💕' },
  { id: 24, name: 'Sci-Fi', icon: '🚀' },
  { id: 36, name: 'Slice of Life', icon: '🌸' },
  { id: 30, name: 'Sports', icon: '⚽' },
  { id: 37, name: 'Supernatural', icon: '👁️' },
  { id: 40, name: 'Psychological', icon: '🧠' },
  { id: 18, name: 'Mecha', icon: '🤖' },
  { id: 13, name: 'Historical', icon: '📜' },
  { id: 23, name: 'School', icon: '📚' },
  { id: 17, name: 'Martial Arts', icon: '🥋' },
  { id: 38, name: 'Military', icon: '🎖️' },
  { id: 41, name: 'Thriller', icon: '😰' },
  { id: 19, name: 'Music', icon: '🎵' },
]

const CUR_YEAR = new Date().getFullYear()
export const ARCHIVE_YEARS = [CUR_YEAR, CUR_YEAR - 1, CUR_YEAR - 2, CUR_YEAR - 3]

export function getGenreById(id) {
  return GENRES.find(g => g.id === id) ?? GENRES[0]
}

export function getDefaultArchiveYear() {
  return ARCHIVE_YEARS[0]
}
