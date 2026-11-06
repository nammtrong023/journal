import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const SUPABASE_STORAGE_URL_KEY = 'journal_supabase_url'
export const SUPABASE_STORAGE_ANON_KEY = 'journal_supabase_anon_key'

export interface SupabaseConfig {
  url: string
  anonKey: string
}

let cachedClient: SupabaseClient | null = null
let cachedUrl = ''
let cachedKey = ''

/**
 * Returns current Supabase config from Vite env vars or localStorage.
 */
export function getSupabaseConfig(): SupabaseConfig | null {
  // 1. Try env vars first (supports Vite, Vercel Supabase integration & Next.js presets)
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta.env as Record<string, string | undefined>) : undefined
  const envUrl =
    metaEnv?.VITE_SUPABASE_URL ||
    metaEnv?.SUPABASE_URL ||
    metaEnv?.NEXT_PUBLIC_SUPABASE_URL ||
    'https://zcmknxpffyrhwmiioboy.supabase.co'
  const envKey =
    metaEnv?.VITE_SUPABASE_ANON_KEY ||
    metaEnv?.SUPABASE_ANON_KEY ||
    metaEnv?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    metaEnv?.SUPABASE_PUBLISHABLE_KEY ||
    metaEnv?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (envUrl && envKey) {
    return { url: envUrl.trim(), anonKey: envKey.trim() }
  }

  // 2. Try browser localStorage (configured directly through the UI modal)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const localUrl = localStorage.getItem(SUPABASE_STORAGE_URL_KEY) || envUrl
      const localKey = localStorage.getItem(SUPABASE_STORAGE_ANON_KEY)
      if (localUrl && localKey) {
        return { url: localUrl.trim(), anonKey: localKey.trim() }
      }
    } catch {
      // Ignore security errors with localStorage in restricted environments
    }
  }

  return null
}

/**
 * Persists Supabase config to localStorage for instant client-side activation.
 */
export function saveSupabaseConfig(url: string, anonKey: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(SUPABASE_STORAGE_URL_KEY, url.trim())
    localStorage.setItem(SUPABASE_STORAGE_ANON_KEY, anonKey.trim())
    window.dispatchEvent(new Event('supabase-config-changed'))
  }
  cachedClient = null
}

/**
 * Clears Supabase configuration.
 */
export function clearSupabaseConfig(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(SUPABASE_STORAGE_URL_KEY)
    localStorage.removeItem(SUPABASE_STORAGE_ANON_KEY)
    window.dispatchEvent(new Event('supabase-config-changed'))
  }
  cachedClient = null
}

/**
 * Lazily instantiates and caches the Supabase client. Returns null if not configured.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig()
  if (!config?.url || !config?.anonKey) {
    return null
  }

  if (cachedClient && cachedUrl === config.url && cachedKey === config.anonKey) {
    return cachedClient
  }

  try {
    cachedClient = createClient(config.url, config.anonKey)
    cachedUrl = config.url
    cachedKey = config.anonKey
    return cachedClient
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err)
    return null
  }
}

/**
 * Checks whether Supabase is configured.
 */
export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null
}
