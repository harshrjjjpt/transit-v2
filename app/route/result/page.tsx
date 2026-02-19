'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import BubbleRouteMap from '@/components/bubble-route-map'
import { useTransit } from '@/components/transit-context'
import { Card } from '@/components/ui'
import { computeDistanceKm, computeFare, getStationsBetweenOnLine, haversine, stationById, stationsByIds } from '@/lib/utils'

type Coordinates = { lat: number; lng: number }

type SignalMode = 'gps' | 'predicted' | 'stale'

const MIN_MOVEMENT_KM = 0.025
const MIN_UPDATE_INTERVAL_MS = 2500
const GPS_STALE_AFTER_MS = 18000
const MAX_PREDICTION_WINDOW_MS = 4 * 60 * 1000
const TRAIN_SPEED_KM_PER_HOUR = 32
const STATION_DWELL_MS = 22000

export default function RouteResultPage() {
  const { selectedSource, selectedDestination, selectedRoute, gps, setGpsData } = useTransit()
  const [tracking, setTracking] = useState(false)
  const [alertStationId, setAlertStationId] = useState<string | null>(null)
  const [showApproachModal, setShowApproachModal] = useState(false)
  const [waitAtStation, setWaitAtStation] = useState(false)
  const [predictedGps, setPredictedGps] = useState<Coordinates | null>(null)
  const [signalMode, setSignalMode] = useState<SignalMode>('gps')

  const notifiedStationsRef = useRef(new Set<string>())
  const lastAcceptedGpsRef = useRef<{ lat: number; lng: number; ts: number } | null>(null)
  const speedRef = useRef(0)
  const predictionStartRef = useRef<number | null>(null)

  const source = stationById(selectedSource)
  const destination = stationById(selectedDestination)

  const fallbackLine = source.lines.find((line) => destination.lines.includes(line)) ?? source.lines[0]
  const fallbackStations = getStationsBetweenOnLine(fallbackLine, source.id, destination.id)
  const routeStationIds = selectedRoute?.stationIds ?? fallbackStations
  const routeStations = useMemo(() => stationsByIds(routeStationIds), [routeStationIds])

  const fare = selectedRoute?.fare ?? computeFare(selectedSource, selectedDestination)
  const time = selectedRoute?.etaMin ?? Math.max(12, Math.round(Number(computeDistanceKm(selectedSource, selectedDestination)) * 2.8))
  const interchanges = selectedRoute && selectedRoute.lines.length > 1 ? 1 : 0

  const effectiveGps = predictedGps ?? gps

  const playerStationId = useMemo(() => {
    if (!effectiveGps) return undefined
    return routeStations
      .map((s) => ({ id: s.id, d: haversine(effectiveGps.lat, effectiveGps.lng, s.lat, s.lng) }))
      .sort((a, b) => a.d - b.d)[0]?.id
  }, [effectiveGps, routeStations])

  useEffect(() => {
    notifiedStationsRef.current = new Set()
    setAlertStationId(null)
    setShowApproachModal(false)
    setPredictedGps(null)
    setSignalMode('gps')
    predictionStartRef.current = null
    speedRef.current = 0
    lastAcceptedGpsRef.current = null
  }, [routeStationIds])

  useEffect(() => {
    if (!playerStationId) return

    const currentIdx = routeStationIds.findIndex((id) => id === playerStationId)
    const destinationIdx = routeStationIds.length - 1
    if (currentIdx < 0 || currentIdx > destinationIdx) return

    const remainingStops = destinationIdx - currentIdx
    if (remainingStops > 3 || remainingStops < 0) return

    if (notifiedStationsRef.current.has(playerStationId)) return

    notifiedStationsRef.current.add(playerStationId)
    setAlertStationId(playerStationId)
    setShowApproachModal(true)

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([250, 120, 250, 120, 320])
    }

    const timer = window.setTimeout(() => setShowApproachModal(false), 10000)
    return () => window.clearTimeout(timer)
  }, [playerStationId, routeStationIds])

  const destinationStationName = stationById(routeStationIds[routeStationIds.length - 1]).name
  const alertStationName = alertStationId ? stationById(alertStationId).name : ''

  useEffect(() => {
    if (!tracking || !navigator.geolocation) return undefined

    const fallbackStationName = stationById(routeStationIds[0]).name

    const findNearestRouteStationName = (lat: number, lng: number) => {
      let nearestName = fallbackStationName
      let nearestDistance = Number.POSITIVE_INFINITY

      for (const station of routeStations) {
        const distance = haversine(lat, lng, station.lat, station.lng)
        if (distance < nearestDistance) {
          nearestDistance = distance
          nearestName = station.name
        }
      }

      return nearestName
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude

        const now = Date.now()
        const previous = lastAcceptedGpsRef.current
        const movedDistance = previous ? haversine(previous.lat, previous.lng, lat, lng) : Number.POSITIVE_INFINITY
        const elapsedMs = previous ? now - previous.ts : Number.POSITIVE_INFINITY

        if (movedDistance < MIN_MOVEMENT_KM && elapsedMs < MIN_UPDATE_INTERVAL_MS) return

        if (previous && elapsedMs > 0) {
          const instantSpeed = movedDistance / (elapsedMs / (60 * 60 * 1000))
          speedRef.current = speedRef.current === 0 ? instantSpeed : (speedRef.current * 0.65) + (instantSpeed * 0.35)
        }

        lastAcceptedGpsRef.current = { lat, lng, ts: now }
        predictionStartRef.current = null
        setPredictedGps(null)
        setSignalMode('gps')
        setGpsData({ lat, lng }, findNearestRouteStationName(lat, lng))
      },
      () => undefined,
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 15000 },
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [tracking, routeStationIds, routeStations, setGpsData])

  useEffect(() => {
    if (!tracking) return

    const tick = window.setInterval(() => {
      const last = lastAcceptedGpsRef.current
      if (!last) return

      const now = Date.now()
      const staleForMs = now - last.ts
      if (staleForMs < GPS_STALE_AFTER_MS) {
        setSignalMode('gps')
        return
      }

      if (waitAtStation || speedRef.current < 8) {
        setSignalMode('stale')
        setPredictedGps(null)
        return
      }

      if (!predictionStartRef.current) predictionStartRef.current = now
      const predictionElapsed = now - predictionStartRef.current
      if (predictionElapsed > MAX_PREDICTION_WINDOW_MS) {
        setSignalMode('stale')
        setPredictedGps(null)
        return
      }

      const nearestIdx = routeStations
        .map((station, idx) => ({ idx, d: haversine(last.lat, last.lng, station.lat, station.lng) }))
        .sort((a, b) => a.d - b.d)[0]?.idx ?? 0

      let travelBudgetKm = (Math.min(Math.max(speedRef.current, 12), TRAIN_SPEED_KM_PER_HOUR) * (predictionElapsed / (60 * 60 * 1000)))

      let nextIdx = nearestIdx
      let predicted = { lat: routeStations[nearestIdx].lat, lng: routeStations[nearestIdx].lng }

      while (travelBudgetKm > 0 && nextIdx < routeStations.length - 1) {
        const currentStation = routeStations[nextIdx]
        const nextStation = routeStations[nextIdx + 1]
        const segmentDistanceKm = haversine(currentStation.lat, currentStation.lng, nextStation.lat, nextStation.lng)

        if (travelBudgetKm <= segmentDistanceKm) {
          const ratio = segmentDistanceKm === 0 ? 0 : travelBudgetKm / segmentDistanceKm
          predicted = {
            lat: currentStation.lat + ((nextStation.lat - currentStation.lat) * ratio),
            lng: currentStation.lng + ((nextStation.lng - currentStation.lng) * ratio),
          }
          travelBudgetKm = 0
          break
        }

        travelBudgetKm -= segmentDistanceKm

        const dwellKmEquivalent = (Math.min(Math.max(speedRef.current, 12), TRAIN_SPEED_KM_PER_HOUR) * (STATION_DWELL_MS / (60 * 60 * 1000)))
        travelBudgetKm = Math.max(0, travelBudgetKm - dwellKmEquivalent)

        nextIdx += 1
        predicted = { lat: routeStations[nextIdx].lat, lng: routeStations[nextIdx].lng }
      }

      setSignalMode('predicted')
      setPredictedGps(predicted)
    }, 1000)

    return () => window.clearInterval(tick)
  }, [tracking, routeStations, waitAtStation])


  return (
    <div className="space-y-4 anim-page">
      {/* Page title */}
      <div>
        <h2 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.03em' }}>Your Journey</h2>
        <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-dim)' }}>{source.name} → {destination.name}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 stagger">
        {[
          { label: 'Time', value: `${time}m`, color: 'var(--accent-blue)' },
          { label: 'Fare', value: `₹${fare}`, color: 'var(--accent-green)' },
          { label: 'Stops', value: `${routeStationIds.length}`, color: 'var(--accent-yellow)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card-lift rounded-2xl p-3.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>{label}</p>
            <p className="mt-1.5 text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Fare split */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="mb-3 text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Fare Breakdown</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-xl p-3 text-center" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
            <p className="text-[9px]" style={{ color: 'var(--text-dim)' }}>Token</p>
            <p className="mt-1 text-lg font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>₹{fare}</p>
          </div>
          <div className="text-xs" style={{ color: 'var(--text-dim)' }}>vs</div>
          <div className="flex-1 rounded-xl p-3 text-center" style={{ background: 'color-mix(in srgb, var(--accent-green) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-green) 22%, transparent)' }}>
            <p className="text-[9px]" style={{ color: 'color-mix(in srgb, var(--accent-green) 65%, transparent)' }}>Smart Card</p>
            <p className="mt-1 text-lg font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--accent-green)' }}>₹{Math.floor(fare * 0.9)}</p>
          </div>
        </div>
        <p className="mt-2 text-[10px]" style={{ color: 'var(--text-dim)' }}>Distance: {computeDistanceKm(selectedSource, selectedDestination)} km · {interchanges} interchange{interchanges !== 1 ? 's' : ''}</p>
      </div>

      {/* GPS Tracking */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Live Tracking</p>
          {tracking && (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#4ade80' }} />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: '#4ade80' }} />
              </span>
              <span className="text-[9px]" style={{ color: 'var(--accent-green)' }}>Active</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setTracking((v) => !v)}
            className="rounded-xl px-3 py-2 text-xs font-semibold transition-all"
            style={{
              background: tracking ? '#4ade8015' : 'var(--surface2)',
              color: tracking ? '#4ade80' : 'var(--text-muted)',
              border: `1px solid ${tracking ? '#4ade8030' : 'var(--border)'}`,
            }}
          >
            {tracking ? '⬛ Stop' : '▶ Start'} GPS
          </button>
          <button
            onClick={() => setWaitAtStation((v) => !v)}
            className="rounded-xl px-3 py-2 text-xs font-semibold transition-all"
            style={{
              background: waitAtStation ? '#f5c84215' : 'var(--surface2)',
              color: waitAtStation ? '#f5c842' : 'var(--text-muted)',
              border: `1px solid ${waitAtStation ? '#f5c84230' : 'var(--border)'}`,
            }}
          >
            {waitAtStation ? '⏸ At Station' : '🚇 On Train'}
          </button>
        </div>
        {tracking && (
          <p className="mt-2 text-[10px]" style={{ color: signalMode === 'gps' ? '#4ade80' : signalMode === 'predicted' ? '#f5c842' : 'var(--text-dim)' }}>
            {signalMode === 'gps' ? '● GPS healthy — tracking exact position' : signalMode === 'predicted' ? '◑ Weak signal — using motion prediction' : '○ Signal lost — prediction paused'}
          </p>
        )}
      </div>

      {/* Bubble Map */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="mb-3 text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Route Map</p>
        <BubbleRouteMap stationIds={routeStationIds} playerStationId={playerStationId} />
      </div>

      {/* Premium Timeline */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Station Timeline</p>
          <p className="text-[9px]" style={{ color: 'var(--text-dim)' }}>{routeStationIds.length} stops</p>
        </div>
        <div className="px-4 pb-4 timeline-track">
          {routeStationIds.map((id, idx) => {
            const isPlayer = playerStationId === id
            const isFirst = idx === 0
            const isLast = idx === routeStationIds.length - 1
            const isPassed = playerStationId
              ? routeStationIds.indexOf(playerStationId) > idx
              : false

            let dotColor = 'var(--border-strong)'
            if (isFirst) dotColor = '#e0e0e0'
            if (isLast) dotColor = '#f87171'
            if (isPassed) dotColor = '#4ade8066'
            if (isPlayer) dotColor = '#4ade80'

            return (
              <div
                key={id}
                className="flex items-center gap-3 py-2.5"
                style={{ opacity: isPassed && !isPlayer ? 0.45 : 1 }}
              >
                {/* Dot on the track */}
                <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center">
                  {isPlayer && (
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{ background: '#4ade8030', animation: 'ping 1.4s ease-out infinite' }}
                    />
                  )}
                  <div
                    className="h-[10px] w-[10px] rounded-full"
                    style={{
                      background: dotColor,
                      boxShadow: isPlayer ? '0 0 8px #4ade8088' : 'none',
                    }}
                  />
                </div>

                {/* Station info */}
                <div className="flex flex-1 items-center justify-between gap-2">
                  <div>
                    <p
                      className="text-sm leading-tight"
                      style={{
                        fontWeight: isPlayer || isFirst || isLast ? 600 : 400,
                        color: isPlayer ? '#f0f0f0' : 'var(--text-muted)',
                      }}
                    >
                      {stationById(id).name}
                    </p>
                    {(isFirst || isLast) && (
                      <p className="text-[9px] font-semibold mt-0.5" style={{ color: isFirst ? '#aaaaaa' : '#f87171' }}>
                        {isFirst ? 'Departure' : 'Destination'}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isPlayer && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                        style={{ background: 'color-mix(in srgb, var(--accent-green) 12%, transparent)', color: 'var(--accent-green)', border: '1px solid color-mix(in srgb, var(--accent-green) 28%, transparent)' }}
                      >
                        HERE
                      </span>
                    )}
                    <p className="text-[10px] tabular-nums" style={{ color: 'var(--text-dim)' }}>
                      {String(idx + 1).padStart(2, '0')}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Approach Modal */}
      {showApproachModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(12px)' }}
        >
          <div
            className="modal-enter w-full max-w-sm rounded-2xl p-5"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)' }}
          >
            {/* Top accent */}
            <div className="mb-4 h-[2px] rounded-full" style={{ background: '#4ade80', width: '30%' }} />
            <div
              className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1"
              style={{ background: 'color-mix(in srgb, var(--accent-green) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-green) 28%, transparent)' }}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full" style={{ background: '#4ade80' }} />
                <span className="relative flex h-1.5 w-1.5 rounded-full" style={{ background: '#4ade80' }} />
              </span>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent-green)' }}>Upcoming Stop</p>
            </div>
            <h3 className="text-lg font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>{destinationStationName}</h3>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              Currently at <span style={{ color: 'var(--text)' }}>{alertStationName}</span>. Prepare to disembark soon.
            </p>
            <p className="mt-2 text-[10px]" style={{ color: 'var(--text-dim)' }}>
              Alerts trigger from 3 stops before your destination.
            </p>
            <button
              onClick={() => setShowApproachModal(false)}
              className="mt-4 w-full rounded-xl py-2.5 text-sm font-semibold transition-all"
              style={{ background: 'var(--text)', color: 'var(--bg)' }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
