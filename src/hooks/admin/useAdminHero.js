import { useState } from 'react'
import {
  createHeroEntry,
  deleteHeroEntry,
  fetchHeroEntries,
  fetchHeroSettings,
  updateHeroEntry,
  updateHeroSettings,
} from '../../services/heroAdmin'
import { searchAnimeByName } from '../../services/animeLookup'

const HERO_UPDATED_EVENT = 'watchout:hero-updated'
const EMPTY_HERO_DRAFT = {
  animeId: '',
  imageUrl: '',
  logoUrl: '',
  sortOrder: 0,
  active: true,
  hideTitle: true,
}

function notifyHeroUpdated() {
  window.dispatchEvent(new CustomEvent(HERO_UPDATED_EVENT))
}

export function useAdminHero() {
  const [heroEntries, setHeroEntries] = useState([])
  const [heroLoading, setHeroLoading] = useState(false)
  const [heroSaving, setHeroSaving] = useState(false)
  const [heroSettingsSaving, setHeroSettingsSaving] = useState(false)
  const [heroMaxItems, setHeroMaxItems] = useState(5)
  const [heroSearch, setHeroSearch] = useState('')
  const [heroSearchResults, setHeroSearchResults] = useState([])
  const [heroSearchLoading, setHeroSearchLoading] = useState(false)
  const [heroSearchError, setHeroSearchError] = useState('')
  const [heroFeedback, setHeroFeedback] = useState('')
  const [heroError, setHeroError] = useState('')
  const [newHero, setNewHero] = useState(EMPTY_HERO_DRAFT)

  async function loadHeroEntries() {
    setHeroLoading(true)
    Promise.all([fetchHeroEntries(), fetchHeroSettings()])
      .then(([entries, settings]) => {
        setHeroEntries(entries)
        setHeroMaxItems(settings?.max_items ?? 5)
      })
      .finally(() => setHeroLoading(false))
  }

  async function handleCreateHero(e) {
    e.preventDefault()
    const animeId = Number(newHero.animeId)
    setHeroFeedback('')
    setHeroError('')
    if (!animeId) {
      setHeroError('Selecione ou informe um anime valido antes de adicionar.')
      return
    }
    if (!newHero.imageUrl.trim()) {
      setHeroError('Informe uma URL de imagem para o hero.')
      return
    }
    setHeroSaving(true)
    try {
      const created = await createHeroEntry({
        animeId,
        imageUrl: newHero.imageUrl.trim(),
        logoUrl: newHero.logoUrl.trim() || null,
        sortOrder: Number(newHero.sortOrder) || 0,
        active: newHero.active,
        hideTitle: newHero.hideTitle,
      })
      if (created) {
        setHeroEntries(prev => [...prev, created].sort((a, b) => a.sort_order - b.sort_order))
        setHeroFeedback(`Anime #${created.anime_id} adicionado ao hero.`)
        notifyHeroUpdated()
      }
      setNewHero(EMPTY_HERO_DRAFT)
    } catch (error) {
      setHeroError(error?.message || 'Falha ao adicionar anime ao hero.')
    } finally {
      setHeroSaving(false)
    }
  }

  async function handleToggleHero(entry, field) {
    const updated = await updateHeroEntry(entry.id, {
      [field]: !entry[field === 'active' ? 'active' : 'hide_title'],
    })
    if (updated) {
      setHeroEntries(prev => prev.map(h => h.id === entry.id ? updated : h))
      notifyHeroUpdated()
    }
  }

  async function handleHeroOrder(entry, sortOrder) {
    const updated = await updateHeroEntry(entry.id, { sortOrder })
    if (updated) {
      setHeroEntries(prev => prev.map(h => h.id === entry.id ? updated : h).sort((a, b) => a.sort_order - b.sort_order))
      notifyHeroUpdated()
    }
  }

  async function handleEditHero(entry) {
    const animeId = Number(prompt('ID do anime no MyAnimeList/Jikan', entry.anime_id))
    if (!animeId) return
    const imageUrl = prompt('URL da imagem customizada do hero', entry.image_url)
    if (!imageUrl?.trim()) return
    const logoUrl = prompt('URL da logo do anime (opcional)', entry.logo_url || '') ?? ''
    const updated = await updateHeroEntry(entry.id, { animeId, imageUrl: imageUrl.trim(), logoUrl: logoUrl.trim() || null })
    if (updated) {
      setHeroEntries(prev => prev.map(h => h.id === entry.id ? updated : h))
      notifyHeroUpdated()
    }
  }

  async function handleDeleteHero(id) {
    if (!confirm('Remover este item do hero?')) return
    await deleteHeroEntry(id)
    setHeroEntries(prev => prev.filter(h => h.id !== id))
    notifyHeroUpdated()
  }

  async function handleSaveHeroSettings() {
    setHeroSettingsSaving(true)
    setHeroFeedback('')
    setHeroError('')
    try {
      const next = Math.min(20, Math.max(1, Number(heroMaxItems) || 1))
      const updated = await updateHeroSettings({ maxItems: next })
      setHeroMaxItems(updated.max_items)
      setHeroFeedback(`Limite do hero atualizado para ${updated.max_items}.`)
      notifyHeroUpdated()
    } catch (error) {
      setHeroError(error?.message || 'Falha ao salvar o limite do hero.')
    } finally {
      setHeroSettingsSaving(false)
    }
  }

  async function handleHeroSearch(e) {
    e.preventDefault()
    if (!heroSearch.trim()) return
    setHeroSearchLoading(true)
    setHeroSearchError('')
    try {
      const items = await searchAnimeByName(heroSearch)
      setHeroSearchResults(items)
      if (items.length === 0) setHeroSearchError('Nenhum anime encontrado para essa busca.')
    } catch (error) {
      setHeroSearchResults([])
      setHeroSearchError(error?.message || 'Falha ao buscar anime.')
    } finally {
      setHeroSearchLoading(false)
    }
  }

  function handleSelectHeroAnime(item) {
    setNewHero(prev => ({
      ...prev,
      animeId: String(item.id ?? ''),
      imageUrl: item.imageUrl || prev.imageUrl || '',
      logoUrl: prev.logoUrl || '',
    }))
    setHeroError('')
    setHeroFeedback(`Anime selecionado: ${item.title} (#${item.id}).`)
  }

  return {
    heroEntries,
    heroLoading,
    heroSaving,
    heroSettingsSaving,
    heroMaxItems,
    heroSearch,
    heroSearchResults,
    heroSearchLoading,
    heroSearchError,
    heroFeedback,
    heroError,
    newHero,
    setHeroMaxItems,
    setHeroSearch,
    setNewHero,
    loadHeroEntries,
    handleCreateHero,
    handleToggleHero,
    handleHeroOrder,
    handleEditHero,
    handleDeleteHero,
    handleSaveHeroSettings,
    handleHeroSearch,
    handleSelectHeroAnime,
  }
}
