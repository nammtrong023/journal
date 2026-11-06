import { useState, useEffect } from 'react'
import {
  X,
  Cloud,
  Check,
  Copy,
  UploadCloud,
  DownloadCloud,
  AlertCircle,
  Database,
  ExternalLink,
} from 'lucide-react'
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  getSupabaseClient,
} from '../../data/supabase'
import { defaultRepository } from '../../data/trade-repository'

interface CloudSyncModalProps {
  isOpen: boolean
  onClose: () => void
}

const SQL_SETUP_SCRIPT = `-- 1. Create trades table
create table if not exists trades (
  id text primary key,
  "tradeDate" text not null,
  ticker text,
  side text,
  session text,
  result numeric,
  "rMultiple" numeric,
  emotions jsonb,
  slides jsonb,
  "templateVersion" int,
  "createdAt" text,
  "updatedAt" text
);

-- Enable RLS and allow simple access for personal journal
alter table trades enable row level security;
drop policy if exists "Allow all for anon" on trades;
create policy "Allow all for anon" on trades for all using (true) with check (true);

-- 2. Create storage bucket for trade images
insert into storage.buckets (id, name, public) 
values ('trade-images', 'trade-images', true)
on conflict (id) do nothing;

drop policy if exists "Public images access" on storage.objects;
create policy "Public images access" on storage.objects for all using (bucket_id = 'trade-images') with check (bucket_id = 'trade-images');
`

export function CloudSyncModal({ isOpen, onClose }: CloudSyncModalProps) {
  const [url, setUrl] = useState('')
  const [anonKey, setAnonKey] = useState('')
  const [connected, setConnected] = useState(false)
  const [copied, setCopied] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (isOpen) {
      const config = getSupabaseConfig()
      if (config) {
        setUrl(config.url)
        setAnonKey(config.anonKey)
        setConnected(true)
      } else {
        setConnected(false)
      }
      setMessage(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim() || !anonKey.trim()) {
      setMessage({ type: 'error', text: 'Please provide both Supabase URL and Anon Key' })
      return
    }

    saveSupabaseConfig(url.trim(), anonKey.trim())
    const client = getSupabaseClient()

    if (!client) {
      setMessage({ type: 'error', text: 'Invalid Supabase configuration' })
      return
    }

    setSyncing(true)
    setMessage(null)

    try {
      // Test connectivity by checking trades table
      const { error } = await client.from('trades').select('id').limit(1)
      if (error && error.code !== 'PGRST116') {
        throw error
      }
      setConnected(true)
      setMessage({ type: 'success', text: 'Connected to Supabase successfully!' })
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setMessage({
        type: 'error',
        text: `Connected with warning: ${errMsg}. Make sure you ran the SQL setup script below.`,
      })
      setConnected(true) // Still saved
    } finally {
      setSyncing(false)
    }
  }

  const handleDisconnect = () => {
    clearSupabaseConfig()
    setUrl('')
    setAnonKey('')
    setConnected(false)
    setMessage({ type: 'success', text: 'Disconnected. Local-only mode active.' })
  }

  const handlePushAll = async () => {
    setSyncing(true)
    setMessage(null)
    try {
      const res = await defaultRepository.syncAllToRemote()
      setMessage({
        type: 'success',
        text: `Synced ${res.tradesSynced} trades and ${res.imagesSynced} images to Supabase!`,
      })
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setMessage({ type: 'error', text: `Sync failed: ${errMsg}` })
    } finally {
      setSyncing(false)
    }
  }

  const handlePullAll = async () => {
    setSyncing(true)
    setMessage(null)
    try {
      const res = await defaultRepository.syncFromRemote()
      setMessage({
        type: 'success',
        text: `Restored ${res.pulledTrades} trades from Supabase into this device!`,
      })
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setMessage({ type: 'error', text: `Restore failed: ${errMsg}` })
    } finally {
      setSyncing(false)
    }
  }

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SETUP_SCRIPT)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-bg-panel border border-border rounded-xl shadow-2xl p-6 text-text-main">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/80">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${connected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-text-muted'}`}>
              <Cloud size={20} />
            </div>
            <div>
              <h3 className="font-bold text-text-strong text-base">Cloud Database & Image Storage</h3>
              <p className="text-xs text-text-muted">Backup trades & chart images permanently with Supabase</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-strong hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status indicator */}
        <div className="mt-4 flex items-center justify-between p-3 rounded-lg bg-bg-main border border-border/70 text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="font-medium text-text-strong">
              {connected ? 'Supabase Connected' : 'Local Storage Only (Browser DB)'}
            </span>
          </div>
          <a
            href="https://supabase.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-accent-blue hover:underline"
          >
            <span>supabase.com</span>
            <ExternalLink size={12} />
          </a>
        </div>

        {/* Feedback Alert */}
        {message && (
          <div
            className={`mt-3 p-3 rounded-lg text-xs flex items-start gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{message.text}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1">
              Project URL
            </label>
            <input
              type="url"
              placeholder="https://your-project-id.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-bg-input border border-border text-text-strong placeholder:text-text-muted/50 focus:outline-none focus:border-accent-blue font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1">
              Anon / Public API Key
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-bg-input border border-border text-text-strong placeholder:text-text-muted/50 focus:outline-none focus:border-accent-blue font-mono"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {connected ? (
              <button
                type="button"
                onClick={handleDisconnect}
                className="px-3 py-1.5 text-xs rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                Disconnect
              </button>
            ) : <span />}

            <button
              type="submit"
              disabled={syncing}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-accent-blue hover:bg-accent-blue-hover text-white transition-colors disabled:opacity-50"
            >
              {syncing ? 'Connecting...' : connected ? 'Update Keys' : 'Connect Supabase'}
            </button>
          </div>
        </form>

        {/* Sync Actions (if connected) */}
        {connected && (
          <div className="mt-5 pt-4 border-t border-border/80">
            <h4 className="text-xs font-bold text-text-strong mb-2.5 flex items-center gap-1.5">
              <Database size={14} className="text-accent-blue" />
              Manual Sync Actions
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={syncing}
                onClick={handlePushAll}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 border border-border text-text-main hover:text-text-strong transition-colors disabled:opacity-50"
              >
                <UploadCloud size={14} className="text-accent-blue" />
                <span>Upload Local → Cloud</span>
              </button>
              <button
                type="button"
                disabled={syncing}
                onClick={handlePullAll}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 border border-border text-text-main hover:text-text-strong transition-colors disabled:opacity-50"
              >
                <DownloadCloud size={14} className="text-emerald-400" />
                <span>Restore Cloud → Local</span>
              </button>
            </div>
          </div>
        )}

        {/* 1-Click SQL Setup snippet */}
        <div className="mt-5 pt-4 border-t border-border/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-text-strong">
              Supabase 1-Click SQL Setup Script
            </span>
            <button
              type="button"
              onClick={handleCopySql}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] rounded bg-white/5 hover:bg-white/10 border border-border text-text-muted hover:text-text-strong transition-colors"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copied ? 'Copied!' : 'Copy SQL'}</span>
            </button>
          </div>
          <p className="text-[11px] text-text-muted mb-2">
            Paste this into your Supabase Dashboard &gt; <strong>SQL Editor</strong> &gt; Click <strong>Run</strong>:
          </p>
          <pre className="p-2.5 rounded-lg bg-bg-main border border-border text-[10px] font-mono text-text-muted overflow-x-auto max-h-28">
            {SQL_SETUP_SCRIPT}
          </pre>
        </div>
      </div>
    </div>
  )
}
