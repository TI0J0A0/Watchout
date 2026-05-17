import { AVATAR_GRADS } from '../../constants'

export function CommunityAvatar({ profile, size = 32 }) {
  const grad = AVATAR_GRADS[profile?.avatar_grad ?? 0] ?? AVATAR_GRADS[0]
  const label = (profile?.display_name || profile?.username || '?').slice(0, 2).toUpperCase()

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg,${grad[0]},${grad[1]})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, color: '#fff',
    }}>{label}</div>
  )
}
