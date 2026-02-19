'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { LINE_OPTIONS, STATIONS, type MetroLine } from '@/lib/data'

type GPS = { lat: number; lng: number }

export type SelectedRoute = {
  title: string
  lines: MetroLine[]
  stationIds: string[]
  etaMin: number
  fare: number
}

type TransitState = {
  selectedSource: string
  selectedDestination: string
  selectedLiveStation: string
  selectedLine: MetroLine
  selectedRoute: SelectedRoute | null
  gps: GPS | null
  nearestName: string
  setSelectedSource: (v: string) => void
  setSelectedDestination: (v: string) => void
  setSelectedLiveStation: (v: string) => void
  setSelectedLine: (v: MetroLine) => void
  setSelectedRoute: (route: SelectedRoute | null) => void
  setGpsData: (gps: GPS, nearestName: string) => void
}

const TransitContext = createContext<TransitState | null>(null)

const DEFAULT_SOURCE = STATIONS[0]?.id ?? ''
const DEFAULT_DESTINATION = STATIONS[1]?.id ?? DEFAULT_SOURCE
const DEFAULT_LINE = LINE_OPTIONS[0] ?? ''
const STORAGE_KEY = 'transit:selected-route'

function isStationId(value: string) {
  return STATIONS.some((station) => station.id === value)
}

function isLine(value: string): value is MetroLine {
  return LINE_OPTIONS.includes(value as MetroLine)
}

export function TransitProvider({ children }: { children: React.ReactNode }) {
  const [selectedSource, setSelectedSource] = useState(DEFAULT_SOURCE)
  const [selectedDestination, setSelectedDestination] = useState(DEFAULT_DESTINATION)
  const [selectedLiveStation, setSelectedLiveStation] = useState(DEFAULT_SOURCE)
  const [selectedLine, setSelectedLine] = useState<MetroLine>(DEFAULT_LINE)
  const [selectedRoute, setSelectedRoute] = useState<SelectedRoute | null>(null)
  const [gps, setGps] = useState<GPS | null>(null)
  const [nearestName, setNearestName] = useState('Not detected')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return

    try {
      const parsed = JSON.parse(saved) as {
        source?: string
        destination?: string
        route?: SelectedRoute | null
      }

      if (parsed.source && isStationId(parsed.source)) setSelectedSource(parsed.source)
      if (parsed.destination && isStationId(parsed.destination)) setSelectedDestination(parsed.destination)
      if (
        parsed.route &&
        parsed.route.stationIds.every(isStationId) &&
        parsed.route.lines.every(isLine)
      ) {
        setSelectedRoute(parsed.route)
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const payload = JSON.stringify({
      source: selectedSource,
      destination: selectedDestination,
      route: selectedRoute,
    })
    window.localStorage.setItem(STORAGE_KEY, payload)
  }, [selectedDestination, selectedRoute, selectedSource])

  const value = useMemo(
    () => ({
      selectedSource,
      selectedDestination,
      selectedLiveStation,
      selectedLine,
      selectedRoute,
      gps,
      nearestName,
      setSelectedSource,
      setSelectedDestination,
      setSelectedLiveStation,
      setSelectedLine,
      setSelectedRoute,
      setGpsData: (coords: GPS, nearest: string) => {
        setGps(coords)
        setNearestName(nearest)
      },
    }),
    [gps, nearestName, selectedDestination, selectedLine, selectedLiveStation, selectedRoute, selectedSource],
  )

  return <TransitContext.Provider value={value}>{children}</TransitContext.Provider>
}

export function useTransit() {
  const ctx = useContext(TransitContext)
  if (!ctx) throw new Error('useTransit must be used inside TransitProvider')
  return ctx
}
