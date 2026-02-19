'use client'

import { useEffect, useMemo, useState } from 'react'
import { STATIONS } from '@/lib/data'

type StationSearchDropdownProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  style?: React.CSSProperties
  name?: string
  required?: boolean
  mode?: 'id' | 'name'
}

export default function StationSearchDropdown({
  value,
  onChange,
  placeholder = 'Search station',
  className = '',
  style,
  name,
  required = false,
  mode = 'id',
}: StationSearchDropdownProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const selectedStation = useMemo(() => {
    if (!value) return undefined
    return mode === 'id'
      ? STATIONS.find((s) => s.id === value)
      : STATIONS.find((s) => s.name === value)
  }, [mode, value])

  useEffect(() => {
    setQuery(selectedStation?.name ?? '')
  }, [selectedStation?.name])

  const filteredStations = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return STATIONS.slice(0, 30)
    return STATIONS.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 24)
  }, [query])

  const inputStyle: React.CSSProperties = {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '9px 12px',
    fontSize: '13px',
    color: 'var(--text)',
    width: '100%',
    outline: 'none',
    fontFamily: 'DM Sans, sans-serif',
    transition: 'border-color 0.2s',
    ...style,
  }

  return (
    <div className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={value} required={required} />}
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setIsOpen(true) }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          setTimeout(() => {
            setIsOpen(false)
            const exact = STATIONS.find((s) => s.name.toLowerCase() === query.trim().toLowerCase())
            if (exact) {
              onChange(mode === 'id' ? exact.id : exact.name)
              setQuery(exact.name)
            } else if (!value) {
              setQuery('')
            } else {
              setQuery(selectedStation?.name ?? '')
            }
          }, 120)
        }}
        placeholder={placeholder}
        style={inputStyle}
      />

      {isOpen && filteredStations.length > 0 && (
        <div
          className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-xl"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-strong)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {filteredStations.map((station, i) => (
            <button
              key={station.id}
              type="button"
              className="flex w-full items-center justify-between px-3 py-2.5 text-left"
              style={{
                borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                background: 'transparent',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(mode === 'id' ? station.id : station.name)
                setQuery(station.name)
                setIsOpen(false)
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)' }}>{station.name}</span>
              <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>{station.lines.join(' · ')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
