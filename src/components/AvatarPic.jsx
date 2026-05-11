import { useState, useEffect } from 'react'
import { AVATAR_GRADS } from '../constants'

export function AvatarPic({ profile, size = 40, animated = false }) {
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    setImgError(false)
  }, [profile?.avatar_url])

  const grad = AVATAR_GRADS[profile?.avatar_grad ?? 0] ?? AVATAR_GRADS[0]
  const label = (profile?.display_name || profile?.username || '?').slice(0, 2).toUpperCase()
  const showImg = profile?.avatar_url && !imgError

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      overflow: 'hidden',
      background: showImg ? 'transparent' : `linear-gradient(135deg,${grad[0]},${grad[1]})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.3, fontWeight: 700, color: '#fff',
      ...(animated ? { outline: '2.5px solid #0A84FF', outlineOffset: 2 } : {}),
    }}>
      {showImg
        ? <img
            src={profile.avatar_url}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setImgError(true)}
          />
        : label
      }
    </div>
  )
}
