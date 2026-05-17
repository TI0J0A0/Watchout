import { fmtTime } from '../../utils'

export function ProfileTasteCard({ T, bannerColor, personality, tasteProfile }) {
  if (!personality) return null

  return (
    <div style={{
      padding: '16px 20px', borderRadius: 16, marginBottom: 24,
      background: `linear-gradient(135deg, ${bannerColor.a}18, ${bannerColor.b}10)`,
      border: `1px solid ${bannerColor.a}25`,
    }}>
      <p style={{ fontSize: 12, color: T.sub, fontWeight: 500, marginBottom: 4 }}>Your taste</p>
      <p style={{ fontSize: 15, fontWeight: 700, color: T.txt }}>{personality.text}</p>
      <p style={{ fontSize: 12, color: T.sub, marginTop: 4 }}>
        Top genres: {tasteProfile.topGenres.slice(0, 3).join(` ${String.fromCharCode(183)} `)}
      </p>
    </div>
  )
}

export function FavoriteGenresSection({ T, t, bannerColor, tasteProfile }) {
  if (!tasteProfile?.topGenres.length) return null

  return (
    <section style={{ marginBottom:36 }}>
      <h2 style={{ fontSize:18, fontWeight:700, color:T.txt,
        letterSpacing:'-.02em', marginBottom:14 }}>{t('profile.favoriteGenres')}</h2>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {tasteProfile.topGenres.slice(0, 6).map(g => {
          const pct = Math.round(tasteProfile.weights[g] * 100)
          const mins = tasteProfile.genreMinutes[g] || 0
          const avg = tasteProfile.avgScoreByGenre[g]
          return (
            <div key={g}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ fontSize:13, fontWeight:600, color:T.txt }}>{g}</span>
                <div style={{ display:'flex', gap:10, fontSize:11, color:T.sub }}>
                  {avg && <span>{String.fromCharCode(9733)} {avg}</span>}
                  <span>{fmtTime(mins)}</span>
                  <span>{pct}%</span>
                </div>
              </div>
              <div style={{ height:6, borderRadius:3, background:T.surf2 }}>
                <div style={{ height:'100%', borderRadius:3, width:`${pct}%`,
                  background:`linear-gradient(90deg, ${bannerColor.a}, ${bannerColor.b})`,
                  transition:'width .4s ease' }}/>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function FavoriteStudiosSection({ T, t, bannerColor, tasteProfile }) {
  if (!tasteProfile?.topStudios.length) return null

  return (
    <section style={{ marginBottom:36 }}>
      <h2 style={{ fontSize:18, fontWeight:700, color:T.txt,
        letterSpacing:'-.02em', marginBottom:14 }}>{t('profile.favoriteStudios')}</h2>
      <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
        {tasteProfile.topStudios.map((studio, index) => (
          <span key={studio} style={{
            padding:'5px 14px', borderRadius:20, fontSize:12, fontWeight:600,
            background: index === 0 ? `${bannerColor.a}20` : T.surf2,
            color: index === 0 ? bannerColor.a : T.sub,
            border: `1px solid ${index === 0 ? bannerColor.a + '30' : T.bord}`,
          }}>{studio}</span>
        ))}
      </div>
    </section>
  )
}

export function EmptyLibraryState({ T, t, animeCount }) {
  if (animeCount > 0) return null

  return (
    <div style={{ textAlign:'center', padding:'60px 20px' }}>
      <p style={{ fontSize:38, marginBottom:12 }}>{String.fromCodePoint(0x1F4FA)}</p>
      <p style={{ fontSize:15, fontWeight:600, color:T.txt, marginBottom:6 }}>
        {t('profile.noAnime')}
      </p>
      <p style={{ fontSize:13, color:T.sub, lineHeight:1.55 }}>
        {t('profile.explorePrompt')}
      </p>
    </div>
  )
}
