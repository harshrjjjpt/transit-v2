'use client'

import { useEffect, useMemo, useState } from 'react'
import { LINE_DETAILS, LIVE_ALERTS, STATIONS } from '@/lib/data'
import { useTransit } from '@/components/transit-context'
import RoutePlannerWidget from '@/components/route-planner-widget'
import { nearestStation } from '@/lib/utils'
import { getGeoUnsupportedReason, isMobileBrowser, requestApproximatePositionByIP, requestCurrentPositionWithFallback, getGeoDeniedMessage } from '@/lib/geolocation'
import { getLineHexColor, getLineName } from '@/lib/line-style'
import Link from 'next/link'

export default function HomePage() {
  const { nearestName, setGpsData } = useTransit()
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'error' | 'ready'>('idle')
  const [locationMessage, setLocationMessage] = useState('')
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const unsupportedReason = getGeoUnsupportedReason()
    if (unsupportedReason) { setLocationStatus('error'); setLocationMessage(unsupportedReason); return }
    if (isMobileBrowser()) { setLocationStatus('idle'); return }
    setLocationStatus('loading')
    requestCurrentPositionWithFallback()
      .then((pos) => {
        const nearest = nearestStation(pos.coords.latitude, pos.coords.longitude)
        setGpsData({ lat: pos.coords.latitude, lng: pos.coords.longitude }, nearest.name)
        setLocationStatus('ready')
      })
      .catch(async (err) => {
        const geo = err as GeolocationPositionError | undefined
        try {
          const approx = await requestApproximatePositionByIP()
          setGpsData({ lat: approx.lat, lng: approx.lng }, `${nearestStation(approx.lat, approx.lng).name} (approx)`)
          setLocationStatus('ready')
        } catch {
          setLocationStatus('error')
          setLocationMessage(geo?.code === 1 ? await getGeoDeniedMessage('') : 'Unable to detect location.')
        }
      })
  }, [setGpsData])

  const nearestLabel = useMemo(() => {
    if (locationStatus === 'loading') return 'Detecting…'
    if (locationStatus === 'error') return locationMessage || 'Unavailable'
    if (nearestName === 'Not detected') return 'Enable location to detect'
    return nearestName
  }, [locationMessage, locationStatus, nearestName])

  // Group lines by family prefix and pick best stats
  const lineGroups = useMemo(() => {
    const seen = new Map<string, { name: string; color: string; stations: number; line: string }>()
    LINE_DETAILS.forEach((m) => {
      const prefix = m.line.split('_')[0] ?? m.line
      if (!seen.has(prefix)) {
        const stationCount = STATIONS.filter((s) => s.lines.includes(m.line)).length
        seen.set(prefix, {
          name: getLineName(m.line),
          color: getLineHexColor(m.line),
          stations: stationCount,
          line: m.line,
        })
      } else {
        const existing = seen.get(prefix)!
        const stationCount = STATIONS.filter((s) => s.lines.includes(m.line)).length
        if (stationCount > existing.stations) {
          seen.set(prefix, { ...existing, stations: stationCount })
        }
      }
    })
    return Array.from(seen.values())
      .filter((g) => g.stations > 0)
      .sort((a, b) => b.stations - a.stations)
      .slice(0, 8)
  }, [])

  const maxStations = lineGroups[0]?.stations ?? 1
  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const dateStr = time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div className="space-y-3 anim-page">
      {/* Hero — journey planner */}
      <section
        className="relative overflow-hidden rounded-2xl p-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {/* Subtle top highlight line */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.10) 40%, rgba(255,255,255,0.10) 60%, transparent 100%)' }} />

        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--text-dim)' }}>Where to next?</p>
            <h2 className="mt-1 text-[26px] font-bold leading-tight" style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.04em' }}>
              Plan your<br/>journey
            </h2>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold tabular-nums" style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.03em' }}>{timeStr}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>{dateStr}</p>
          </div>
        </div>

        <RoutePlannerWidget compact />
      </section>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-2 stagger">
        {[
          { href: '/live',    label: 'Live Board', sub: 'Real-time', color: 'var(--accent-green)',
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2"/><path d="M8.93 6.35a6 6 0 000 11.3M15.07 6.35a6 6 0 010 11.3"/><path d="M5.64 3.64a11 11 0 000 16.72M18.36 3.64a11 11 0 010 16.72"/></svg> },
          { href: '/map',     label: 'Metro Map',  sub: 'All lines',  color: 'var(--accent-blue)',
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg> },
          { href: '/fare',    label: 'Fare Calc',  sub: 'Estimate',   color: 'var(--accent-yellow)',
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
        ].map(({ href, label, sub, color, icon }) => (
          <Link
            key={href}
            href={href}
            className="card-lift flex flex-col gap-3 rounded-2xl p-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <span style={{ color }}>{icon}</span>
            <div>
              <p className="text-xs font-semibold leading-tight">{label}</p>
              <p className="mt-0.5 text-[9px]" style={{ color: 'var(--text-dim)' }}>{sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Nearest station */}
      <div
        className="flex items-center gap-3 rounded-2xl p-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: locationStatus === 'ready' ? '#4ade8012' : 'var(--surface2)',
            border: `1px solid ${locationStatus === 'ready' ? '#4ade8025' : 'var(--border)'}`,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: locationStatus === 'ready' ? '#4ade80' : 'var(--text-dim)' }}>
            <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Nearest Station</p>
          <p className="mt-0.5 truncate text-sm font-semibold">{nearestLabel}</p>
        </div>
        {locationStatus === 'ready' && (
          <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: 'color-mix(in srgb, var(--accent-green) 10%, transparent)', color: 'var(--accent-green)', border: '1px solid color-mix(in srgb, var(--accent-green) 22%, transparent)' }}>
            GPS
          </span>
        )}
      </div>

      {/* Service alert */}
      <div
        className="flex items-start gap-3 rounded-2xl p-4"
        style={{ background: 'var(--surface)', border: '1px solid color-mix(in srgb, var(--accent-yellow) 12%, transparent)' }}
      >
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm" style={{ background: 'color-mix(in srgb, var(--accent-yellow) 12%, transparent)', color: 'var(--accent-yellow)' }}>
          ⚡
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'color-mix(in srgb, var(--accent-yellow) 45%, transparent)' }}>Service Alert</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{LIVE_ALERTS[0]}</p>
        </div>
      </div>

      {/* Metro lines — properly colored */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <p className="text-[9px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--text-dim)' }}>Metro Lines</p>
          <Link href="/map" className="text-[9px]" style={{ color: 'var(--text-dim)' }}>View map →</Link>
        </div>
        <div>
          {lineGroups.map(({ name, color, stations, line }) => {
            const pct = Math.round((stations / maxStations) * 100)
            return (
              <div key={line} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
                {/* Color swatch */}
                <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}66` }} />
                <p className="flex-1 text-xs font-medium capitalize">{name} Line</p>
                {/* Progress bar */}
                <div className="flex items-center gap-2">
                  <div className="h-[3px] w-20 overflow-hidden rounded-full" style={{ background: 'var(--surface3)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color, opacity: 0.75 }} />
                  </div>
                  <p className="w-10 text-right text-[9px] tabular-nums" style={{ color: 'var(--text-dim)' }}>{stations}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
