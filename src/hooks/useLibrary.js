import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { mergeWithUserData, saveUserData } from '../utils'
import { fetchSeasonal, fetchTop, fetchAnimeById } from '../services/jikan'
import { loadUserLibrary, upsertAnime, upsertAnimesBatch, removeAnime } from '../services/userAnime'
import { useAuth } from '../context/AuthContext'
import { createNotification, hasRecentEpisodeNotification } from '../services/notifications'
import { trackMetricEvent } from '../services/metrics'

export function useLibrary() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [data, setData]         = useState([])
  const [topData, setTopData]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [topLoaded, setTopLoaded] = useState(false)
  const noteTimer = useRef(null)
  const supabaseLoaded = useRef(false)

  useEffect(() => {
    fetchSeasonal()
      .then(items => {
        setData(prev => {
          const prevById = Object.fromEntries(prev.map(i => [i.id, i]))
          const baseItems = supabaseLoaded.current ? items : mergeWithUserData(items)
          const merged = baseItems.map(i =>
            prevById[i.id]?.userStatus != null
              ? { ...i, userStatus: prevById[i.id].userStatus, userScore: prevById[i.id].userScore, userEp: prevById[i.id].userEp, userNotes: prevById[i.id].userNotes }
              : i
          )
          const newIds = new Set(merged.map(i => i.id))
          const extras = prev.filter(i => !newIds.has(i.id))
          const combined = [...merged, ...extras]
          const seen = new Set()
          return combined.filter(i => { if (seen.has(i.id)) return false; seen.add(i.id); return true })
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!user) return
    loadUserLibrary()
      .then(library => {
        supabaseLoaded.current = true
        setData(prev => {
          const byId = Object.fromEntries(library.map(i => [i.id, i]))
          const seasonalIds = new Set(prev.map(i => i.id))
          const updated = prev.map(i =>
            byId[i.id]
              ? { ...i, userStatus: byId[i.id].userStatus, userScore: byId[i.id].userScore, userEp: byId[i.id].userEp, userNotes: byId[i.id].userNotes }
              : { ...i, userStatus: null, userScore: null, userEp: 0, userNotes: '' }
          )
          const extra = library.filter(i => !seasonalIds.has(i.id))
          const merged = [...updated, ...extra]
          // Deduplicate by id keeping first occurrence
          const seen = new Set()
          return merged.filter(i => { if (seen.has(i.id)) return false; seen.add(i.id); return true })
        })

        // Proactively notify about episodes airing today — fire-and-forget
        const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const today = DAYS[new Date().getDay()]
        const airingToday = library.filter(i =>
          i.userStatus === 'watching' && i.airing && i.airDay === today
        )
        ;(async () => {
          for (const item of airingToday) {
            const already = await hasRecentEpisodeNotification(user.id, item.id, 5)
            if (!already) {
              await createNotification(
                user.id,
                'new_episode',
                'New episode today!',
                `${item.title} is airing today`,
                { anime_id: item.id, air_day: item.airDay },
              ).catch(() => {})
            }
          }
        })()

        // Enrich items that have no image (e.g. from MAL import)
        const needsEnrich = library.filter(i => !i.img).slice(0, 60)
        if (needsEnrich.length === 0) return
        ;(async () => {
          for (const item of needsEnrich) {
            await new Promise(r => setTimeout(r, 360))
            try {
              const full = await fetchAnimeById(item.id)
              const enriched = {
                ...full,
                userStatus: item.userStatus,
                userScore:  item.userScore,
                userEp:     item.userEp,
                userNotes:  item.userNotes,
              }
              setData(prev => prev.map(i => i.id === enriched.id ? enriched : i))
              upsertAnime(user.id, enriched).catch(() => {})
            } catch {}
          }
        })()
      })
      .catch(console.error)
  }, [user?.id])

  //desabilado por hora -  erro de sync local storage
//  useEffect(() => {
//   if (!user && data.length > 0) saveUserData(data)
//  }, [data, user])
//

  const loadTop = () => {
    if (topLoaded) return
    fetchTop()
      .then(items => { setTopData(items); setTopLoaded(true) })
      .catch(() => {})
  }

  const addToData = (item) => {
    setData(d => d.find(i => i.id === item.id) ? d : [...d, item])
  }

const setStatus = (id, s) => {
    // 1. Bloqueia a execução imediatamente se não houver utilizador logado
    if (!user) {
      // Podes retornar null ou uma mensagem para o Toast avisar o utilizador
      return 'Inicie sessão para guardar animes na sua lista' 
    }

    const it = data.find(i => i.id === id)
    if (!it) return null

    const removing = it.userStatus === s
    const updated = {
      ...it,
      userStatus: removing ? null : s,
      userEp: (!removing && s === 'completed' && it.eps) ? it.eps : it.userEp,
    }

    // 2. Atualiza o estado local na interface
    setData(d => d.map(i => i.id === id ? updated : i))

    // 3. Como já garantimos que o 'user' existe no início, 
    // removemos o "if (user)" extra e chamamos o Supabase diretamente
    if (removing) {
      removeAnime(user.id, id).catch(console.error)
    } else {
      upsertAnime(user.id, updated).catch(console.error)
    }

    trackMetricEvent({
      type: 'status_change',
      userId: user.id,
      animeId: id,
      metadata: { status: removing ? null : s },
    })
    if (!removing && s === 'plan_to_watch') {
      trackMetricEvent({
        type: 'watchlist_add',
        userId: user.id,
        animeId: id,
        metadata: { title: it.title },
      })
    }

    return removing ? t('common.removedFromList') : `${it.title} → ${t(`status.${s}`)}`
  }
  
  const setScore = (id, v) => {
    const it = data.find(i => i.id === id)
    if (!it) return
    const next = { ...it, userScore: v }
    setData(d => d.map(i => i.id === id ? next : i))
    if (user) {
      upsertAnime(user.id, next).catch(console.error)
      trackMetricEvent({
        type: 'score_change',
        userId: user.id,
        animeId: id,
        metadata: { score: v },
      })
    }
  }

  const setEp = (id, v) => {
    const it = data.find(i => i.id === id)
    if (!it) return
    const next = { ...it, userEp: v }
    setData(d => d.map(i => i.id === id ? next : i))
    if (user) {
      upsertAnime(user.id, next).catch(console.error)
      trackMetricEvent({
        type: 'episode_progress',
        userId: user.id,
        animeId: id,
        metadata: { progress: v },
      })
    }
  }

  const setNotes = (id, text) => {
    const it = data.find(i => i.id === id)
    if (!it) return
    const updated = { ...it, userNotes: text }
    setData(d => d.map(i => i.id === id ? updated : i))
    if (user) {
      clearTimeout(noteTimer.current)
      noteTimer.current = setTimeout(
        () => {
          upsertAnime(user.id, updated).catch(console.error)
          trackMetricEvent({
            type: 'notes_change',
            userId: user.id,
            animeId: id,
            metadata: { hasNotes: Boolean(text.trim()), length: text.length },
          })
        },
        800
      )
    }
  }

  const importFromMAL = async (items) => {
    const unique = [...new Map(items.map(i => [i.id, i])).values()]
    setData(prev => {
      const updated = prev.map(p => {
        const match = unique.find(i => i.id === p.id)
        return match
          ? { ...p, userStatus: match.userStatus, userScore: match.userScore, userEp: match.userEp }
          : p
      })
      const existingIds = new Set(prev.map(i => i.id))
      return [...updated, ...unique.filter(i => !existingIds.has(i.id))]
    })
    if (user) await upsertAnimesBatch(user.id, unique)
  }

  return {
    data, setData, loading,
    topData, topLoaded, loadTop,
    setStatus, setScore, setEp, setNotes,
    importFromMAL, addToData,
  }
}
