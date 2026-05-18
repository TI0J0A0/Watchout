const BASE = "https://api.jikan.moe/v4";

const PALETTES = [
  ["#FF6B35","#FF9A5C"], ["#5856D6","#AF52DE"], ["#34AADC","#5AC8FA"],
  ["#30B0C7","#64D2FF"], ["#FF9F0A","#FFD60A"], ["#BF5AF2","#DA8FFF"],
  ["#32ADE6","#5AC8FA"], ["#FF2D55","#FF6B81"], ["#34C759","#30D158"],
  ["#636366","#98989D"],
];

const DAY_KEY = {
  Mondays:"Mon", Tuesdays:"Tue", Wednesdays:"Wed",
  Thursdays:"Thu", Fridays:"Fri", Saturdays:"Sat", Sundays:"Sun",
};

const GENRE_PT = {
  Action:"Ação", Adventure:"Aventura", Comedy:"Comédia", Drama:"Drama",
  Fantasy:"Fantasia", Horror:"Terror", Mystery:"Mistério", Romance:"Romance",
  "Sci-Fi":"Ficção Científica", "Slice of Life":"Slice of Life",
  Sports:"Esportes", Thriller:"Suspense", Supernatural:"Sobrenatural",
  "Martial Arts":"Artes Marciais", Psychological:"Psicológico",
  Mecha:"Mecha", Music:"Musical", Historical:"Histórico",
  "School":"Escola", Military:"Militar",
};

function parseDuration(str) {
  if (!str) return 24;
  const hr  = str.match(/(\d+)\s*hr/);
  const min = str.match(/(\d+)\s*min/);
  return (hr ? parseInt(hr[1]) * 60 : 0) + (min ? parseInt(min[1]) : 0) || 24;
}

function mapStreaming(streaming = []) {
  return streaming
    .filter(s => s && typeof s.name === 'string' && s.name.trim())
    .map(s => ({
      name: s.name.trim(),
      url: typeof s.url === 'string' ? s.url : '',
    }))
}

export function mapAnime(a) {
  const [color, colorB] = PALETTES[a.mal_id % PALETTES.length];
  return {
    id:       a.mal_id,
    title:    a.title_english || a.title,
    score:    a.score || 0,
    eps:      a.episodes || null,
    type:     a.type === "Movie" ? "film" : "anime",
    studio:   a.studios?.[0]?.name || "—",
    year:     a.year || new Date().getFullYear(),
    genres:   (a.genres || []).map(g => GENRE_PT[g.name] || g.name),
    airing:      a.status === "Currently Airing",
    comingSoon:  a.status === "Not yet aired",
    airDay:   DAY_KEY[a.broadcast?.day] || null,
    duration: parseDuration(a.duration),
    color, colorB,
    img:      a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || "",
    synopsis: a.synopsis || "",
    streaming: mapStreaming(a.streaming),
    members:  a.members || 0,
    trailer:  a.trailer?.embed_url ?? null,
    userStatus: null, userScore: null, userEp: 0, userNotes: "",
  };
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`Jikan ${res.status}: ${path}`);
  return res.json();
}

export async function fetchSeasonal() {
  const { data } = await get("/seasons/now?limit=24");
  return data.map(mapAnime);
}

export async function fetchTop() {
  const { data } = await get("/top/anime?limit=25");
  return data.map((a, i) => ({ ...mapAnime(a), rank: i + 1 }));
}

export async function searchAnime(query) {
  const { data } = await get(`/anime?q=${encodeURIComponent(query)}&limit=20&sfw=true`);
  return data.map(mapAnime);
}

export async function fetchPopular() {
  const { data } = await get('/anime?status=airing&order_by=members&sort=desc&limit=15&sfw=true');
  return data.map(mapAnime);
}

export async function fetchUpcoming() {
  const { data } = await get('/seasons/upcoming?limit=15');
  return data.map(mapAnime);
}

export async function fetchByGenre(genreId, limit = 15) {
  const { data } = await get(
    `/anime?genres=${genreId}&order_by=score&sort=desc&limit=${limit}&sfw=true&type=tv`
  );
  return data.map(mapAnime);
}

export async function fetchSeasonArchive(year, season) {
  const { data } = await get(`/seasons/${year}/${season}?limit=24`)
  return data.map(mapAnime)
}


export async function fetchCharacters(id) {
  const { data } = await get(`/anime/${id}/characters`)
  return data.slice(0, 16).map(c => ({
    name:  c.character.name,
    img:   c.character.images?.jpg?.image_url || '',
    role:  c.role,
    va:    c.voice_actors?.find(v => v.language === 'Japanese')?.person?.name || '',
    vaImg: c.voice_actors?.find(v => v.language === 'Japanese')?.person?.images?.jpg?.image_url || '',
  }))
}

export async function fetchAnimeById(id) {
  const { data } = await get(`/anime/${id}/full`)
  return mapAnime(data)
}

export async function fetchRelations(id) {
  const { data } = await get(`/anime/${id}/relations`)
  const related = []
  for (const rel of (data ?? [])) {
    if (rel.relation !== 'Sequel' && rel.relation !== 'Prequel') continue
    for (const entry of (rel.entry ?? [])) {
      if (entry.type === 'anime') related.push({ relation: rel.relation, malId: entry.mal_id, name: entry.name })
    }
  }
  return related
}

export async function fetchRecommendations(id) {
  const { data } = await get(`/anime/${id}/recommendations`);
  return data.slice(0, 10).map(r => {
    const a = r.entry;
    const [color, colorB] = PALETTES[a.mal_id % PALETTES.length];
    return {
      id:    a.mal_id,
      title: a.title,
      img:   a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || "",
      score: 0, eps: null, type: "anime", studio: "—", year: "",
      genres: [], airing: false, airDay: null, duration: 24,
      color, colorB, synopsis: "", streaming: [], members: 0, trailer: null,
      userStatus: null, userScore: null, userEp: 0, userNotes: "",
    };
  });
}
