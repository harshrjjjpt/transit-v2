'use client'

import { useState } from 'react'
import { useTheme } from './theme-context'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const [spinning, setSpinning] = useState(false)

  const handleClick = () => {
    setSpinning(true)
    toggleTheme()
    setTimeout(() => setSpinning(false), 450)
  }

  const isDark = theme === 'dark'

  return (
    <button
      onClick={handleClick}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className="relative flex h-8 w-8 items-center justify-center rounded-full overflow-hidden"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-strong)',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      {/* Background glow on hover */}
      <span
        className="absolute inset-0 rounded-full opacity-0 transition-opacity duration-200"
        style={{
          background: isDark
            ? 'radial-gradient(circle, rgba(245,200,66,0.15) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(30,30,60,0.12) 0%, transparent 70%)',
        }}
      />

      {/* Icon */}
      <span
        className={spinning ? 'theme-toggle-spin' : ''}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}
      >
        {isDark ? <SunIcon /> : <MoonIcon />}
      </span>
    </button>
  )
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#f5c842' }}>
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}
