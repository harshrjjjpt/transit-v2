'use client'

import { computeFare, nearestStation } from '@/lib/utils'
import { getGeoDeniedMessage, getGeoUnsupportedReason, requestApproximatePositionByIP, requestCurrentPositionWithFallback } from '@/lib/geolocation'
import { LIVE_ALERTS } from '@/lib/data'
import { BottomTabs } from './ui'
import { useTransit } from './transit-context'
import { ThemeToggle } from './theme-toggle'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { selectedSource, selectedDestination, nearestName, setGpsData } = useTransit()
  const routeFare = computeFare(selectedSource, selectedDestination)

  const onGPS = async () => {
    const unsupportedReason = getGeoUnsupportedReason()
    if (unsupportedReason) { alert(unsupportedReason); return }
    try {
      const position = await requestCurrentPositionWithFallback()
      const nearest = nearestStation(position.coords.latitude, position.coords.longitude)
      setGpsData({ lat: position.coords.latitude, lng: position.coords.longitude }, nearest.name)
    } catch (error) {
      const geoError = error as GeolocationPositionError | undefined
      if (geoError?.code === 1 || geoError?.code === 2 || geoError?.code === 3) {
        try {
          const approx = await requestApproximatePositionByIP()
          const nearest = nearestStation(approx.lat, approx.lng)
          setGpsData({ lat: approx.lat, lng: approx.lng }, `${nearest.name} (approx)`)
          return
        } catch { /* continue */ }
      }
      alert(`Unable to get location: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-md pb-32" style={{ position: 'relative', zIndex: 1 }}>

      {/* ── Sticky Header ── */}
      <header
        className="sticky top-0 z-30 px-4 pt-5 pb-4"
        style={{ background: 'linear-gradient(to bottom, var(--bg) 72%, transparent)' }}
      >
        <div className="flex items-center justify-between">

          {/* Brand mark */}
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl font-black"
              style={{
                fontFamily: 'Syne, sans-serif',
                fontSize: '15px',
                letterSpacing: '-0.07em',
                background: 'var(--text)',
                color: 'var(--bg)',
                flexShrink: 0,
              }}
            >
              M
            </div>
            <div>
              <h1
                style={{
                  fontFamily: 'Syne, sans-serif',
                  fontSize: '15px',
                  fontWeight: 800,
                  letterSpacing: '-0.045em',
                  lineHeight: 1,
                  color: 'var(--text)',
                }}
              >
                MetroFlow
              </h1>
              <p style={{ fontSize: '9px', color: 'var(--text-dim)', marginTop: '2px', fontWeight: 500 }}>
                Premium transit
              </p>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">

            {/* Live badge */}
            <div
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full"
                  style={{ background: 'var(--accent-green)', opacity: 0.75 }}
                />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent-green)' }} />
              </span>
              <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--accent-green)' }}>Live</span>
            </div>

            {/* GPS */}
            <button
              onClick={onGPS}
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              title="Detect location"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-dim)' }}>
                <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>
              </svg>
            </button>

            {/* Theme toggle */}
            <ThemeToggle />
          </div>
        </div>

        {/* Status strip */}
        <div
          className="mt-3 flex items-stretch rounded-xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {[
            { label: 'Nearest', value: nearestName },
            { label: 'Fare',    value: `₹${routeFare}` },
            { label: 'Alert',   value: (LIVE_ALERTS[0] ?? '').substring(0, 16) + '…' },
          ].map(({ label, value }, i) => (
            <div
              key={label}
              className="flex-1 min-w-0 px-3 py-2"
              style={{ borderLeft: i > 0 ? '1px solid var(--border)' : 'none' }}
            >
              <p style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-dim)' }}>
                {label}
              </p>
              <p className="truncate" style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text)', marginTop: '2px' }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </header>

      <main className="space-y-3 px-4">{children}</main>
      <BottomTabs />
    </div>
  )
}
