'use client'

import { useEffect, useMemo } from 'react'
import { LINE_OPTIONS, STATIONS, STATION_SCHEDULES } from '@/lib/data'
import { useTransit } from '@/components/transit-context'
import { getLineHexColor } from '@/lib/line-style'
import { useGtfsRt, type FetchStatus } from '@/hooks/use-gtfs-rt'
import { STATION_TO_GTFS_STOP_ID } from '@/lib/gtfs-stop-map'

function LiveStatusBadge({ status, lastUpdated, secondsUntilRefresh, onRefresh }: {
  status: FetchStatus; lastUpdated: Date | null; secondsUntilRefresh: number; onRefresh: () => void
}) {
  const cfg: Record<FetchStatus, { color: string; label: string; pulse: boolean }> = {
    idle:        { color: '#666',    label: 'Connecting…', pulse: false },
    loading:     { color: '#f5c842', label: 'Fetching…',   pulse: true  },
    live:        { color: '#4ade80', label: 'Live',        pulse: true  },
    stale:       { color: '#fb923c', label: 'Stale',       pulse: false },
    error:       { color: '#f87171', label: 'Error',       pulse: false },
    unavailable: { color: '#666',    label: 'Offline',     pulse: false },
  }[status]

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <span className="relative flex h-1.5 w-1.5">
          {cfg.pulse && <span className="animate-ping absolute inline-flex h-full w-full rounded-full"
            style={{ background: cfg.color, opacity: 0.75 }} />}
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: cfg.color }} />
        </span>
        <span style={{ fontSize: '9px', fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
      </div>
      {status === 'live' && (
        <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>↻ {secondsUntilRefresh}s</span>
      )}
      <button onClick={onRefresh}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: '2px' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
      </button>
    </div>
  )
}

export default function LivePage() {
  const { selectedLine, setSelectedLine, selectedLiveStation, setSelectedLiveStation } = useTransit()
  const { data, status, lastUpdated, secondsUntilRefresh, refresh, getArrivalsForStop } = useGtfsRt()

  const lineColor = getLineHexColor(selectedLine as any)
  const filteredStations = STATIONS.filter((s) => s.lines.includes(selectedLine))

  useEffect(() => {
    if (filteredStations.some((s) => s.id === selectedLiveStation)) return
    setSelectedLiveStation(filteredStations[0]?.id ?? STATIONS[0]?.id ?? '')
  }, [filteredStations, selectedLiveStation, setSelectedLiveStation])

  const gtfsStopId = STATION_TO_GTFS_STOP_ID[selectedLiveStation]
  const isLiveData = status === 'live' || status === 'stale'

  const liveArrivals = useMemo(() => {
    if (!gtfsStopId || status === 'unavailable') return []
    return getArrivalsForStop(gtfsStopId)
      .filter((a) => (a.departure?.minutesAway ?? a.arrival?.minutesAway ?? -999) > -2)
      .slice(0, 8)
  }, [getArrivalsForStop, gtfsStopId, status])

  const liveAlerts = useMemo(() => {
    if (!data) return []
    const prefix = selectedLine.split('_')[0]
    return data.alerts.filter((a) =>
      a.affectedRoutes.length === 0 || a.affectedRoutes.some((r) => r.includes(prefix))
    )
  }, [data, selectedLine])

  const activeVehicles = useMemo(() => {
    if (!data) return []
    const prefix = selectedLine.split('_')[0]
    return data.vehicles.filter((v) => v.routeId === selectedLine || v.routeId?.startsWith(prefix)).slice(0, 6)
  }, [data, selectedLine])

  // Static schedule fallback
  const staticArrivals = useMemo(() => {
    const rows = STATION_SCHEDULES[selectedLiveStation] ?? []
    const deps = rows.find((r) => r.line === selectedLine)?.departures ?? []
    const now = new Date()
    const nowMins = now.getHours() * 60 + now.getMinutes()
    const toMins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
    return deps.filter((t) => toMins(t) >= nowMins - 1).slice(0, 6)
  }, [selectedLiveStation, selectedLine])

  const toMins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes()

  const useStatic = status === 'unavailable' || (isLiveData && liveArrivals.length === 0)

  return (
    <div className="space-y-3 anim-page">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 800,
            letterSpacing: '-0.04em', color: 'var(--text)' }}>Live Board</h2>
          <p style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
            {lastUpdated
              ? `Feed at ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
              : 'Connecting to GTFS-RT feed…'}
          </p>
        </div>
        <LiveStatusBadge status={status} lastUpdated={lastUpdated}
          secondsUntilRefresh={secondsUntilRefresh} onRefresh={refresh} />
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-2 gap-2 stagger">
        {[
          { label: 'Line', content: (
            <select value={selectedLine} onChange={(e) => setSelectedLine(e.target.value as typeof selectedLine)}>
              {LINE_OPTIONS.map((l) => <option key={l}>{l}</option>)}
            </select>
          )},
          { label: 'Station', content: (
            <select value={selectedLiveStation} onChange={(e) => setSelectedLiveStation(e.target.value)}>
              {filteredStations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )},
        ].map(({ label, content }) => (
          <div key={label} className="rounded-xl p-3"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.14em', color: 'var(--text-dim)', marginBottom: '6px' }}>{label}</p>
            {content}
          </div>
        ))}
      </div>

      {/* Departure board */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {/* Board header */}
        <div className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)', background: `${lineColor}0a` }}>
          <div className="flex items-center gap-2.5">
            <div className="h-2.5 w-2.5 rounded-full"
              style={{ background: lineColor, boxShadow: `0 0 8px ${lineColor}99` }} />
            <div>
              <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.14em', color: lineColor }}>{selectedLine}</p>
              <p style={{ fontSize: '11px', color: 'var(--text)', fontWeight: 500 }}>
                {STATIONS.find((s) => s.id === selectedLiveStation)?.name ?? '—'}
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '8px', color: 'var(--text-dim)' }}>
              {isLiveData && !useStatic ? 'GTFS-RT' : 'SCHEDULED'}
            </p>
            <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>
              Stop #{gtfsStopId ?? '—'}
            </p>
          </div>
        </div>

        {/* Static banner when falling back */}
        {useStatic && (
          <div className="flex items-center gap-2 px-4 py-2"
            style={{ background: 'color-mix(in srgb, var(--accent-yellow) 7%, transparent)',
              borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '10px' }}>⚠️</span>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {status === 'unavailable'
                ? 'Live feed offline · Showing static GTFS schedule'
                : 'No live data for this stop · Showing static schedule'}
            </p>
          </div>
        )}

        {/* Loading skeleton */}
        {status === 'loading' && liveArrivals.length === 0 && !useStatic && (
          <>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5"
                style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none', opacity: 0.6 }}>
                <div className="h-7 w-7 rounded-lg" style={{ background: 'var(--surface2)' }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-16 rounded" style={{ background: 'var(--surface2)' }} />
                  <div className="h-2 w-24 rounded" style={{ background: 'var(--surface3)' }} />
                </div>
                <div className="h-5 w-8 rounded" style={{ background: 'var(--surface2)' }} />
              </div>
            ))}
          </>
        )}

        {/* Live arrivals */}
        {!useStatic && liveArrivals.map((arrival, idx) => {
          const minsAway = arrival.departure?.minutesAway ?? arrival.arrival?.minutesAway
          const delay = arrival.departure?.delay ?? arrival.arrival?.delay ?? 0
          const scheduledTime = arrival.departure?.time ?? arrival.arrival?.time
          const isPast = (minsAway ?? 1) <= -1
          const isNext = idx === 0 && !isPast
          const delayMins = Math.round(Math.abs(delay) / 60)
          const isLate = delay > 60

          return (
            <div key={`${arrival.stopId}-${idx}`}
              className="flex items-center gap-3 px-4 py-3"
              style={{
                borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                background: isNext ? `${lineColor}09` : 'transparent',
                opacity: isPast ? 0.38 : 1,
              }}>
              {/* Seq number */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold"
                style={{
                  background: isNext ? `${lineColor}22` : 'var(--surface2)',
                  color: isNext ? lineColor : 'var(--text-dim)',
                  border: `1px solid ${isNext ? lineColor + '44' : 'var(--border)'}`,
                }}>
                {idx + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'Syne, sans-serif',
                    color: 'var(--text)', letterSpacing: '-0.02em' }}>
                    {scheduledTime
                      ? new Date(scheduledTime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </p>
                  {delayMins > 0 && (
                    <span className="rounded-full px-1.5 py-0.5"
                      style={{
                        fontSize: '8px', fontWeight: 800,
                        background: isLate ? 'color-mix(in srgb, #f87171 12%, transparent)' : 'color-mix(in srgb, #4ade80 12%, transparent)',
                        color: isLate ? '#f87171' : '#4ade80',
                        border: `1px solid ${isLate ? '#f8717133' : '#4ade8033'}`,
                      }}>
                      {isLate ? `+${delayMins}m` : `-${delayMins}m`}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '1px' }}>
                  {selectedLine}
                  {isLiveData && <span style={{ color: 'color-mix(in srgb, #4ade80 55%, transparent)' }}> · live</span>}
                </p>
              </div>

              {/* Countdown */}
              <div style={{ textAlign: 'right', minWidth: '48px' }}>
                {isPast ? (
                  <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Left</p>
                ) : minsAway !== undefined ? (
                  <>
                    <p style={{
                      fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 800,
                      color: minsAway === 0 ? 'var(--accent-green)'
                           : minsAway <= 2 ? 'var(--accent-yellow)'
                           : 'var(--text)',
                      lineHeight: 1,
                    }}>
                      {minsAway <= 0 ? 'Now' : minsAway}
                    </p>
                    {minsAway > 0 && (
                      <p style={{ fontSize: '8px', color: 'var(--text-dim)', marginTop: '1px' }}>min</p>
                    )}
                  </>
                ) : (
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>—</p>
                )}
              </div>
            </div>
          )
        })}

        {/* Static schedule fallback rows */}
        {useStatic && staticArrivals.map((time, idx) => {
          const minsAway = toMins(time) - nowMins
          const isNext = idx === 0
          return (
            <div key={time} className="flex items-center gap-3 px-4 py-3"
              style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                background: isNext ? `${lineColor}09` : 'transparent' }}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold"
                style={{ background: isNext ? `${lineColor}22` : 'var(--surface2)',
                  color: isNext ? lineColor : 'var(--text-dim)',
                  border: `1px solid ${isNext ? lineColor + '44' : 'var(--border)'}` }}>
                {idx + 1}
              </div>
              <div className="flex-1">
                <p style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'Syne, sans-serif', color: 'var(--text)' }}>{time}</p>
                <p style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Scheduled · {selectedLine}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 800, lineHeight: 1,
                  color: minsAway <= 0 ? 'var(--accent-green)' : minsAway <= 2 ? 'var(--accent-yellow)' : 'var(--text)' }}>
                  {minsAway <= 0 ? 'Now' : minsAway}
                </p>
                {minsAway > 0 && <p style={{ fontSize: '8px', color: 'var(--text-dim)', marginTop: '1px' }}>min</p>}
              </div>
            </div>
          )
        })}

        {/* Empty */}
        {!status.match(/idle|loading/) && liveArrivals.length === 0 && staticArrivals.length === 0 && (
          <div style={{ padding: '32px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: '28px', marginBottom: '8px' }}>🚉</p>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>No upcoming departures.</p>
          </div>
        )}
      </div>

      {/* Active vehicles */}
      {activeVehicles.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.14em', color: 'var(--text-dim)' }}>
              On Track · {activeVehicles.length} trains
            </p>
          </div>
          {activeVehicles.map((v, i) => (
            <div key={v.entityId} className="flex items-center gap-3 px-4 py-3"
              style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl shrink-0 text-sm"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                🚇
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
                  Train {v.vehicleLabel ?? v.vehicleId}
                </p>
                <p style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                  {v.statusLabel}{v.stopId ? ` · Stop #${v.stopId}` : ''}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                {v.speed !== undefined && (
                  <p style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'Syne, sans-serif', color: 'var(--text)' }}>
                    {Math.round(v.speed)} <span style={{ fontSize: '9px', fontWeight: 400 }}>km/h</span>
                  </p>
                )}
                {v.secondsAgo !== undefined && (
                  <p style={{ fontSize: '9px', color: 'var(--text-dim)' }}>{v.secondsAgo}s ago</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live alerts */}
      {liveAlerts.length > 0 && (
        <div className="space-y-2">
          <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.14em', color: 'var(--text-dim)' }}>
            Service Alerts · {liveAlerts.length}
          </p>
          {liveAlerts.map((alert) => (
            <div key={alert.entityId} className="flex gap-3 rounded-xl p-3"
              style={{ background: 'color-mix(in srgb, var(--accent-yellow) 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--accent-yellow) 16%, transparent)' }}>
              <span style={{ color: 'var(--accent-yellow)', flexShrink: 0, marginTop: '1px' }}>⚡</span>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
                  {alert.headerText || alert.effect}
                </p>
                {alert.descriptionText && (
                  <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                    {alert.descriptionText}
                  </p>
                )}
                <p style={{ fontSize: '9px', color: 'var(--text-dim)', marginTop: '4px' }}>
                  {alert.cause} · {alert.effect}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
