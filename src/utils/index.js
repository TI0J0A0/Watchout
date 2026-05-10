const STORAGE_KEY = "watchout_v2";

export const fmt     = n => n>=1e6?(n/1e6).toFixed(1)+"M":n>=1e3?Math.round(n/1e3)+"K":String(n);
export const fmtTime = m => m>=60?`${Math.floor(m/60)}h${m%60>0?" "+m%60+"m":""}`:m>0?`${m}m`:"—";

export function mergeWithUserData(apiItems) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && Array.isArray(saved)) {
      const m = Object.fromEntries(saved.map(i => [i.id, i]));
      return apiItems.map(i => ({
        ...i,
        userStatus: m[i.id]?.userStatus ?? null,
        userScore:  m[i.id]?.userScore  ?? null,
        userEp:     m[i.id]?.userEp     ?? 0,
        userNotes:  m[i.id]?.userNotes  ?? "",
      }));
    }
  } catch {}
  return apiItems;
}

export function saveUserData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(
    data.map(i => ({ id:i.id, userStatus:i.userStatus, userScore:i.userScore, userEp:i.userEp, userNotes:i.userNotes||"" }))
  ));
}
