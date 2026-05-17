import { StatBox } from '../StatBox'
import { fmtTime } from '../../utils'

export function ProfileStatsGrid({ t, animeCount, watchedEpisodes, watchTimeMinutes, averageScore }) {
  const empty = String.fromCharCode(8212)

  return (
    <div style={{ display:'grid',
      gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10, marginBottom:36 }}>
      <StatBox fill label={t('profile.animes')} val={animeCount || empty} color="#0A84FF" icon={String.fromCodePoint(0x1F4FA)} />
      <StatBox fill label={t('profile.episodes')} val={watchedEpisodes || empty} color="#34C759" icon={String.fromCharCode(9654)} />
      <StatBox fill label={t('profile.time')} val={fmtTime(watchTimeMinutes)} color="#BF5AF2" icon={String.fromCodePoint(0x23F1)} />
      <StatBox fill label={t('profile.avgScore')} val={averageScore} color="#FF9F0A" icon={String.fromCharCode(9733)} />
    </div>
  )
}
