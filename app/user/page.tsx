'use client'

import { useState } from 'react'
import { useTheme } from '@/components/theme-context'

export default function UserProfilePage() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  const [notifications, setNotifications] = useState(true)
  const [liveAlerts, setLiveAlerts] = useState(true)
  const [smartCard, setSmartCard] = useState(false)
  const [spinning, setSpinning] = useState(false)

  const handleThemeToggle = () => {
    setSpinning(true)
    toggleTheme()
    setTimeout(() => setSpinning(false), 450)
  }

  function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
    return (
      <button
        onClick={onChange}
        style={{
          position: 'relative',
          width: '42px',
          height: '24px',
          borderRadius: '12px',
          border: 'none',
          cursor: 'pointer',
          background: checked ? 'var(--accent-green)' : 'var(--surface3)',
          transition: 'background 0.25s cubic-bezier(0.4,0,0.2,1)',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '3px',
            left: checked ? '21px' : '3px',
            width: '18px',
            height: '18px',
            borderRadius: '9px',
            background: '#fff',
            transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
          }}
        />
      </button>
    )
  }

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div>
        <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-dim)', marginBottom: '8px', paddingLeft: '2px' }}>
          {title}
        </p>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {children}
        </div>
      </div>
    )
  }

  function Row({ label, sub, children, last = false }: { label: string; sub?: string; children: React.ReactNode; last?: boolean }) {
    return (
      <div
        className="flex items-center justify-between px-4 py-3.5"
        style={{ borderBottom: last ? 'none' : '1px solid var(--border)' }}
      >
        <div>
          <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{label}</p>
          {sub && <p style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '1px' }}>{sub}</p>}
        </div>
        {children}
      </div>
    )
  }

  return (
    <div className="space-y-6 anim-page">
      {/* Profile header */}
      <div className="flex items-center gap-4">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-strong)',
            fontFamily: 'Syne, sans-serif',
            color: 'var(--text)',
            letterSpacing: '-0.05em',
          }}
        >
          MF
        </div>
        <div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 800, letterSpacing: '-0.035em', color: 'var(--text)' }}>
            MetroFlow
          </h2>
          <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>Premium transit companion</p>
          <div
            className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{ background: 'color-mix(in srgb, var(--accent-green) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-green) 25%, transparent)' }}
          >
            <div className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent-green)' }} />
            <p style={{ fontSize: '9px', fontWeight: 700, color: 'var(--accent-green)' }}>Premium Active</p>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <Section title="Appearance">
        <Row label="Theme" sub={isDark ? 'Dark mode active' : 'Light mode active'}>
          {/* Premium theme toggle pill */}
          <button
            onClick={handleThemeToggle}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderRadius: '24px',
              padding: '6px 14px 6px 10px',
              background: 'var(--surface2)',
              border: '1px solid var(--border-strong)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <span
              className={spinning ? 'theme-toggle-spin' : ''}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {isDark ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#f5c842' }}>
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </span>
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)' }}>
              {isDark ? 'Switch to Light' : 'Switch to Dark'}
            </p>
          </button>
        </Row>

        {/* Visual theme preview */}
        <div className="px-4 pb-4 pt-1">
          <div className="grid grid-cols-2 gap-2">
            {/* Dark preview */}
            <button
              onClick={() => { if (!isDark) handleThemeToggle() }}
              className="rounded-xl overflow-hidden"
              style={{
                border: isDark ? '2px solid var(--text)' : '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: isDark ? 1 : 0.6,
              }}
            >
              <div style={{ background: '#0a0a0a', padding: '10px' }}>
                <div style={{ background: '#161616', borderRadius: '8px', padding: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ width: '60%', height: '6px', borderRadius: '3px', background: '#f0f0f0', marginBottom: '4px' }} />
                  <div style={{ width: '40%', height: '4px', borderRadius: '2px', background: '#444' }} />
                </div>
              </div>
              <div style={{ background: '#111', padding: '6px 10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: '#888', fontFamily: 'Syne, sans-serif' }}>
                  {isDark && '✓ '}Dark
                </p>
              </div>
            </button>

            {/* Light preview */}
            <button
              onClick={() => { if (isDark) handleThemeToggle() }}
              className="rounded-xl overflow-hidden"
              style={{
                border: !isDark ? '2px solid var(--text)' : '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: !isDark ? 1 : 0.6,
              }}
            >
              <div style={{ background: '#f5f4f0', padding: '10px' }}>
                <div style={{ background: '#ffffff', borderRadius: '8px', padding: '8px', border: '1px solid rgba(0,0,0,0.08)' }}>
                  <div style={{ width: '60%', height: '6px', borderRadius: '3px', background: '#111', marginBottom: '4px' }} />
                  <div style={{ width: '40%', height: '4px', borderRadius: '2px', background: '#ccc' }} />
                </div>
              </div>
              <div style={{ background: '#fff', padding: '6px 10px', borderTop: '1px solid rgba(0,0,0,0.07)' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: '#777', fontFamily: 'Syne, sans-serif' }}>
                  {!isDark && '✓ '}Light
                </p>
              </div>
            </button>
          </div>
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <Row label="Push notifications" sub="Service updates & alerts">
          <Toggle checked={notifications} onChange={() => setNotifications(!notifications)} />
        </Row>
        <Row label="Live alerts" sub="Delays & disruptions" last>
          <Toggle checked={liveAlerts} onChange={() => setLiveAlerts(!liveAlerts)} />
        </Row>
      </Section>

      {/* Payment */}
      <Section title="Payment">
        <Row label="Smart Card" sub="Save 10% on every journey" last>
          <Toggle checked={smartCard} onChange={() => setSmartCard(!smartCard)} />
        </Row>
      </Section>

      {/* App info */}
      <Section title="About">
        <Row label="Version" last>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', fontFamily: 'Syne, sans-serif' }}>2.0.0</p>
        </Row>
      </Section>

      {/* Bottom note */}
      <p style={{ fontSize: '10px', color: 'var(--text-dim)', textAlign: 'center', paddingBottom: '8px' }}>
        MetroFlow Premium · Delhi Metro Transit Companion
      </p>
    </div>
  )
}
