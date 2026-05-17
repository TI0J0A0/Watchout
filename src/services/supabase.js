import { createClient } from '@supabase/supabase-js'

const env = import.meta.env ?? {}
const rawUrl = env.VITE_SUPABASE_URL ?? ''
const key    = env.VITE_SUPABASE_ANON_KEY ?? ''

// Strip any accidental path suffix from the URL
const url = rawUrl
  .replace(/\/(rest|auth|storage|realtime)(\/.*)?$/, '')
  .replace(/\/+$/, '')

const configured = url.startsWith('https://') && key.startsWith('eyJ')

if (!configured && env.DEV) {
  console.warn('[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set — auth and database disabled')
}

export const supabase = configured
  ? createClient(url, key, {
      auth: {
        persistSession:    true,
        autoRefreshToken:  true,
        detectSessionInUrl: true,
        storageKey: 'watchout-auth-v1',
      },
    })
  : null
