'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ── Types (mirrors the API response shape) ─────────────────────────────────

export interface LiveArrival {
  stopId: string
  stopSequence?: number
  arrival?: { delay: number; time?: number; minutesAway?: number }
  departure?: { delay: number; time?: number; minutesAway?: number }
}

export interface LiveTrip {
  entityId: string
  tripId?: string
  routeId?: string
  directionId?: number
  startTime?: string
  startDate?: string
  vehicleId?: string
  stopTimeUpdates: LiveArrival[]
}

export interface LiveVehicle {
  entityId: string
  vehicleId: string
  vehicleLabel?: string
  tripId?: string
  routeId?: string
  directionId?: number
  latitude?: number
  longitude?: number
  bearing?: number
  speed?: number
  stopId?: string
  currentStopSequence?: number
  status: number
  statusLabel: string
  timestamp?: number
  secondsAgo?: number
}

export interface LiveAlert {
  entityId: string
  headerText: string
  descriptionText: string
  cause: string
  effect: string
  affectedRoutes: string[]
  affectedStops: string[]
}

export interface GtfsRtData {
  feedTimestamp: number
  fetchedAt: number
  counts: { tripUpdates: number; vehicles: number; alerts: number }
  tripUpdates: LiveTrip[]
  vehicles: LiveVehicle[]
  alerts: LiveAlert[]
  stale?: boolean
  error?: string
}

export type FetchStatus = 'idle' | 'loading' | 'live' | 'stale' | 'error' | 'unavailable'

export interface UseGtfsRtResult {
  data: GtfsRtData | null
  status: FetchStatus
  lastUpdated: Date | null
  secondsUntilRefresh: number
  refresh: () => void
  // Derived helpers
  getArrivalsForStop: (gtfsStopId: string) => LiveArrival[]
  getVehiclesForRoute: (routeId: string) => LiveVehicle[]
}

const POLL_INTERVAL = 15_000 // 15 seconds

// ── Hook ───────────────────────────────────────────────────────────────────

export function useGtfsRt(): UseGtfsRtResult {
  const [data, setData] = useState<GtfsRtData | null>(null)
  const [status, setStatus] = useState<FetchStatus>('idle')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(POLL_INTERVAL / 1000)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const nextFetchAt = useRef<number>(Date.now())

  const fetch = useCallback(async () => {
    if (status !== 'loading') setStatus('loading')
    try {
      const res = await window.fetch('/api/gtfs-rt', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: GtfsRtData = await res.json()

      setData(json)
      setLastUpdated(new Date())
      setStatus(json.stale ? 'stale' : json.error ? 'error' : 'live')
      nextFetchAt.current = Date.now() + POLL_INTERVAL
    } catch {
      // Network offline or API down
      if (data) {
        setStatus('stale')
      } else {
        setStatus('unavailable')
      }
    }
  }, [data, status])

  // Initial fetch + polling
  useEffect(() => {
    fetch()
    timerRef.current = setInterval(fetch, POLL_INTERVAL)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Countdown until next refresh
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      const secs = Math.max(0, Math.round((nextFetchAt.current - Date.now()) / 1000))
      setSecondsUntilRefresh(secs)
    }, 1000)
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [])

  const refresh = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    fetch()
    timerRef.current = setInterval(fetch, POLL_INTERVAL)
    nextFetchAt.current = Date.now() + POLL_INTERVAL
  }, [fetch])

  // Derived: arrivals at a specific GTFS stop_id
  const getArrivalsForStop = useCallback(
    (gtfsStopId: string): LiveArrival[] => {
      if (!data) return []
      const results: LiveArrival[] = []
      for (const trip of data.tripUpdates) {
        for (const stu of trip.stopTimeUpdates) {
          if (String(stu.stopId) === String(gtfsStopId)) {
            results.push(stu)
          }
        }
      }
      return results.sort((a, b) => {
        const aTime = a.departure?.minutesAway ?? a.arrival?.minutesAway ?? 999
        const bTime = b.departure?.minutesAway ?? b.arrival?.minutesAway ?? 999
        return aTime - bTime
      })
    },
    [data]
  )

  // Derived: vehicles on a given route
  const getVehiclesForRoute = useCallback(
    (routeId: string): LiveVehicle[] => {
      if (!data) return []
      return data.vehicles.filter(
        (v) => v.routeId === routeId || v.routeId?.startsWith(routeId)
      )
    },
    [data]
  )

  return {
    data,
    status,
    lastUpdated,
    secondsUntilRefresh,
    refresh,
    getArrivalsForStop,
    getVehiclesForRoute,
  }
}
