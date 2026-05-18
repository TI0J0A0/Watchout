import { AdminEmpty, AdminLoading, AdminSection, AdminStatsGrid } from './shared'

function formatSeconds(value) {
  if (!value) return '0s'
  const minutes = Math.floor(value / 60)
  const seconds = value % 60
  return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`
}

function formatMs(value) {
  return value ? `${value}ms` : '0ms'
}

function BarList({ T, items, labelKey, valueKey, valueLabel, empty }) {
  const max = Math.max(...items.map(item => item[valueKey] || 0), 1)
  if (items.length === 0) return <AdminEmpty color={T.sub}>{empty}</AdminEmpty>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map(item => {
        const width = `${Math.max(6, ((item[valueKey] || 0) / max) * 100)}%`
        return (
          <div key={`${item[labelKey]}-${item.animeId ?? ''}-${item.episode ?? ''}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, marginBottom: 6 }}>
              <span style={{ color: T.txt, fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item[labelKey]}
                {item.episode ? ` - EP ${item.episode}` : ''}
              </span>
              <span style={{ color: T.sub, fontSize: 12, whiteSpace: 'nowrap' }}>
                {valueLabel ? valueLabel(item[valueKey], item) : item[valueKey]}
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: T.bord, overflow: 'hidden' }}>
              <div style={{ width, height: '100%', borderRadius: 999, background: '#0A84FF' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LineChart({ T, items }) {
  const width = 520
  const height = 150
  const max = Math.max(...items.map(item => item.views || 0), 1)
  const points = items.map((item, index) => {
    const x = items.length === 1 ? width / 2 : (index / (items.length - 1)) * width
    const y = height - ((item.views || 0) / max) * (height - 18) - 6
    return `${x},${y}`
  }).join(' ')

  if (items.length === 0) return <AdminEmpty color={T.sub}>No view history yet.</AdminEmpty>

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height + 26}`} style={{ width: '100%', minWidth: 340, display: 'block' }}>
        <polyline points={points} fill="none" stroke="#0A84FF" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {items.map((item, index) => {
          const x = items.length === 1 ? width / 2 : (index / (items.length - 1)) * width
          const y = height - ((item.views || 0) / max) * (height - 18) - 6
          return (
            <g key={item.date}>
              <circle cx={x} cy={y} r="4" fill="#0A84FF" />
              <text x={x} y={height + 18} textAnchor="middle" fontSize="10" fill={T.sub}>
                {item.date.slice(5)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function MetricTable({ T, columns, rows, empty }) {
  if (rows.length === 0) return <AdminEmpty color={T.sub}>{empty}</AdminEmpty>
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
        <thead>
          <tr>
            {columns.map(column => (
              <th key={column.key} style={{ textAlign: column.align || 'left', color: T.sub, fontSize: 11, padding: '0 10px 8px', textTransform: 'uppercase' }}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.animeId ?? row.query ?? row.device ?? index}-${index}`} style={{ borderTop: `1px solid ${T.bord}` }}>
              {columns.map(column => (
                <td key={column.key} style={{ textAlign: column.align || 'left', color: column.muted ? T.sub : T.txt, fontSize: 13, padding: '10px' }}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function AdminMetricsPanel({ T, loading, stats, card }) {
  if (loading) return <AdminLoading color={T.sub} />

  const devices = Object.values(stats.deviceBreakdown ?? {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h2 style={{ fontSize: 22, color: T.txt, margin: '0 0 6px' }}>Real Metrics</h2>
        <p style={{ fontSize: 13, color: T.sub, margin: 0 }}>
          Product, search, banner, player, and performance analytics collected from real site events.
        </p>
      </div>

      <AdminStatsGrid
        T={T}
        items={[
          ['Anime Views', stats.totalViews],
          ['Episode Plays', stats.totalPlays],
          ['Average Watch Time', formatSeconds(stats.avgWatchTimeSeconds)],
          ['Completion Rate', `${stats.avgCompletionRate}%`],
          ['Video Start Time', formatMs(stats.avgVideoStartMs)],
          ['Player Errors', stats.playerErrors],
          ['Buffering Events', stats.bufferingEvents],
          ['Banner CTR', `${stats.bannerCtr}%`],
        ]}
      />

      <AdminSection T={T} title="Views Trend">
        <div style={{ ...card, display: 'block' }}>
          <LineChart T={T} items={stats.viewsSeries ?? []} />
        </div>
      </AdminSection>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <AdminSection T={T} title="Top Anime Views">
          <div style={{ ...card, display: 'block' }}>
            <BarList T={T} items={stats.topAnimeViews ?? []} labelKey="title" valueKey="views" empty="No anime views yet." />
          </div>
        </AdminSection>

        <AdminSection T={T} title="Top Episode Plays">
          <div style={{ ...card, display: 'block' }}>
            <BarList T={T} items={stats.topEpisodePlays ?? []} labelKey="title" valueKey="plays" empty="No episode plays yet." />
          </div>
        </AdminSection>
      </div>

      <AdminSection T={T} title="Trending Anime">
        <div style={{ ...card, display: 'block' }}>
          <MetricTable
            T={T}
            empty="No trending signals yet."
            rows={stats.trendingAnime ?? []}
            columns={[
              { key: 'title', label: 'Anime' },
              { key: 'score', label: 'Score', align: 'right' },
              { key: 'views24h', label: 'Views 24h', align: 'right', muted: true },
              { key: 'plays24h', label: 'Plays 24h', align: 'right', muted: true },
              { key: 'watchlistAdds24h', label: 'Watchlist', align: 'right', muted: true },
              { key: 'searches24h', label: 'Searches', align: 'right', muted: true },
            ]}
          />
        </div>
      </AdminSection>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <AdminSection T={T} title="Top Searches">
          <div style={{ ...card, display: 'block' }}>
            <MetricTable
              T={T}
              empty="No searches tracked yet."
              rows={stats.topSearchedAnime ?? []}
              columns={[
                { key: 'query', label: 'Search Term' },
                { key: 'searches', label: 'Searches', align: 'right' },
                { key: 'resultClicks', label: 'Clicks', align: 'right', muted: true },
              ]}
            />
          </div>
        </AdminSection>

        <AdminSection T={T} title="Watchlist Adds">
          <div style={{ ...card, display: 'block' }}>
            <BarList T={T} items={stats.topWatchlistAdds ?? []} labelKey="title" valueKey="adds" empty="No watchlist adds yet." />
          </div>
        </AdminSection>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <AdminSection T={T} title="Banner Performance">
          <div style={{ ...card, display: 'block' }}>
            <MetricTable
              T={T}
              empty="No banner events yet."
              rows={stats.bannerPerformance ?? []}
              columns={[
                { key: 'title', label: 'Banner' },
                { key: 'views', label: 'Views', align: 'right' },
                { key: 'clicks', label: 'Clicks', align: 'right' },
                { key: 'ctr', label: 'CTR', align: 'right', render: row => `${row.ctr}%` },
              ]}
            />
          </div>
        </AdminSection>

        <AdminSection T={T} title="Device Performance">
          <div style={{ ...card, display: 'block' }}>
            <MetricTable
              T={T}
              empty="No device data yet."
              rows={devices}
              columns={[
                { key: 'device', label: 'Device' },
                { key: 'events', label: 'Events', align: 'right' },
                { key: 'errors', label: 'Errors', align: 'right' },
                { key: 'avgPageLoadMs', label: 'Load', align: 'right', render: row => formatMs(row.avgPageLoadMs) },
              ]}
            />
          </div>
        </AdminSection>
      </div>

      <AdminSection T={T} title="Streaming Quality">
        <div style={{ ...card, display: 'block' }}>
          <BarList T={T} items={stats.qualityBreakdown ?? []} labelKey="quality" valueKey="events" empty="No quality events yet." />
        </div>
      </AdminSection>
    </div>
  )
}
