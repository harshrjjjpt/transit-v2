'use client'

import { useEffect, useState } from 'react'

// ── SW Registration ────────────────────────────────────────────────────────

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        console.log('[MetroFlow] SW registered:', reg.scope)

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (!newWorker) return
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available — post message to skip waiting
              newWorker.postMessage({ type: 'SKIP_WAITING' })
              window.location.reload()
            }
          })
        })
      } catch (err) {
        console.warn('[MetroFlow] SW registration failed:', err)
      }
    }

    // Defer SW registration until after page load
    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register)
    }
  }, [])

  return null
}

// ── Install Prompt ─────────────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaInstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }

    // Check if user previously dismissed
    try {
      if (localStorage.getItem('pwa-dismissed') === '1') {
        setDismissed(true)
        return
      }
    } catch {}

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstalled(true))

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setPrompt(null)
  }

  const handleDismiss = () => {
    setDismissed(true)
    try { localStorage.setItem('pwa-dismissed', '1') } catch {}
  }

  if (!prompt || dismissed || installed) return null

  return (
    <div
      className="fixed bottom-28 left-4 right-4 z-50 mx-auto max-w-md modal-enter"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-strong)',
        borderRadius: '18px',
        padding: '16px',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      {/* Top accent */}
      <div style={{ height: '2px', width: '40%', background: 'var(--accent-green)',
        borderRadius: '1px', marginBottom: '14px' }} />

      <div className="flex items-start gap-3">
        {/* App icon */}
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-black text-xl"
          style={{
            background: 'var(--text)',
            color: 'var(--bg)',
            fontFamily: 'Syne, sans-serif',
            letterSpacing: '-0.07em',
          }}
        >
          M
        </div>

        <div className="flex-1 min-w-0">
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)',
            fontFamily: 'Syne, sans-serif', letterSpacing: '-0.02em' }}>
            Install MetroFlow
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px', lineHeight: 1.4 }}>
            Add to home screen for offline access & faster load
          </p>
        </div>

        <button
          onClick={handleDismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-dim)', fontSize: '16px', flexShrink: 0, lineHeight: 1, padding: '2px' }}
        >
          ×
        </button>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleInstall}
          style={{
            flex: 1, padding: '10px', borderRadius: '12px',
            background: 'var(--text)', color: 'var(--bg)',
            fontFamily: 'Syne, sans-serif', fontSize: '13px', fontWeight: 700,
            border: 'none', cursor: 'pointer', letterSpacing: '-0.01em',
          }}
        >
          Install App
        </button>
        <button
          onClick={handleDismiss}
          style={{
            padding: '10px 16px', borderRadius: '12px',
            background: 'var(--surface2)', color: 'var(--text-muted)',
            fontSize: '12px', border: '1px solid var(--border)', cursor: 'pointer',
          }}
        >
          Not now
        </button>
      </div>
    </div>
  )
}

// ── Offline status bar ─────────────────────────────────────────────────────

export function OfflineBar() {
  const [isOnline, setIsOnline] = useState(true)
  const [showRestored, setShowRestored] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const onOffline = () => setIsOnline(false)
    const onOnline = () => {
      setIsOnline(true)
      setShowRestored(true)
      setTimeout(() => setShowRestored(false), 3000)
    }

    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
    }
  }, [])

  if (isOnline && !showRestored) return null

  return (
    <div
      className="fixed top-0 inset-x-0 z-[100] flex items-center justify-center gap-2 py-2"
      style={{
        background: isOnline ? 'color-mix(in srgb, #4ade80 15%, var(--surface))' : '#1a0a0a',
        borderBottom: `1px solid ${isOnline ? 'color-mix(in srgb, #4ade80 25%, transparent)' : '#f8717133'}`,
        fontSize: '11px',
        fontWeight: 600,
        color: isOnline ? '#4ade80' : '#f87171',
      }}
    >
      <span>{isOnline ? '✓' : '⚠'}</span>
      {isOnline
        ? 'Connection restored — live data resuming'
        : 'You\'re offline — showing cached data'}
    </div>
  )
}
