'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { LINE_DETAILS, LINE_STATION_ORDER, STATIONS, type MetroLine, type Station } from '@/lib/data'
import { getLineHexColor } from '@/lib/line-style'

declare global {
  interface Window { L?: any }
}

type StationWithMeta = Station & { landmarks: { name: string; distance: number }[] }
type MapLine = { id: string; name: string; color: string; stations: string[] }

const stationMap = new Map(STATIONS.map((s) => [s.id, s]))

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371, r = (v: number) => v * Math.PI / 180
  const dLat = r(lat2 - lat1), dLng = r(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function getLandmarks(station: Station) {
  const nearby = STATIONS
    .filter((s) => s.id !== station.id)
    .map((s) => ({ name: s.name, distance: haversine(station.lat, station.lng, s.lat, s.lng) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 2)
    .map((s) => ({ name: `${s.name} area`, distance: +s.distance.toFixed(1) }))
  return [{ name: `${station.name} Market`, distance: 0.4 }, ...nearby]
}

export default function InteractiveMetroMap() {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<{ id: string; marker: any }[]>([])
  const linesRef = useRef<Map<string, any>>(new Map())

  const [ready, setReady] = useState(false)
  const [selectedStation, setSelectedStation] = useState<StationWithMeta | null>(null)
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)

  const stations = useMemo<StationWithMeta[]>(
    () => STATIONS.map((s) => ({ ...s, landmarks: getLandmarks(s) })),
    []
  )

  const lines = useMemo<MapLine[]>(() => {
    const detailMap = new Map(LINE_DETAILS.map((l) => [l.line, l]))
    return Object.entries(LINE_STATION_ORDER)
      .filter(([id]) => !id.endsWith('_R'))
      .map(([id, stationIds]) => ({
        id,
        name: detailMap.get(id)?.displayName ?? id,
        color: getLineHexColor(id as MetroLine),
        stations: stationIds.filter((sid) => stationMap.has(sid)),
      }))
      .filter((l) => l.stations.length > 1)
  }, [])

  // Load Leaflet CSS + JS dynamically
  useEffect(() => {
    // CSS
    if (!document.querySelector('#leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'
      document.head.appendChild(link)
    }
    // JS
    if (window.L) { setReady(true); return }
    const existing = document.querySelector('#leaflet-js')
    if (existing) {
      existing.addEventListener('load', () => setReady(true))
      return
    }
    const script = document.createElement('script')
    script.id = 'leaflet-js'
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
    script.onload = () => setReady(true)
    document.head.appendChild(script)
  }, [])

  // Build map
  useEffect(() => {
    if (!ready || !window.L || !mapDivRef.current || mapRef.current) return

    const L = window.L
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light'

    const map = L.map(mapDivRef.current, {
      zoomControl: true,
      minZoom: 9,
      maxZoom: 18,
    }).setView([28.6139, 77.209], 11)

    mapRef.current = map

    // Tile layer
    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '© <a href="https://carto.com">CARTO</a>',
    }).addTo(map)

    const bounds = L.latLngBounds([])

    // Draw polylines
    lines.forEach((line) => {
      const coords = line.stations
        .map((sid) => stationMap.get(sid))
        .filter(Boolean)
        .map((s) => [s!.lat, s!.lng] as [number, number])

      if (coords.length < 2) return
      coords.forEach((c) => bounds.extend(c))

      const poly = L.polyline(coords, { color: line.color, weight: 5, opacity: 0.85 }).addTo(map)
      poly.on('click', () => setSelectedLineId((prev) => prev === line.id ? null : line.id))
      linesRef.current.set(line.id, poly)
    })

    // Draw station markers
    stations.forEach((station) => {
      const dotColor = isDark ? '#1e1e1e' : '#ffffff'
      const marker = L.circleMarker([station.lat, station.lng], {
        radius: 5,
        color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
        weight: 1.5,
        fillColor: dotColor,
        fillOpacity: 1,
      }).addTo(map)

      marker.bindTooltip(station.name, {
        direction: 'top',
        offset: [0, -8],
        className: 'leaflet-tooltip-custom',
      })

      marker.on('click', () => {
        setSelectedStation({ ...station, landmarks: getLandmarks(station) })
        setSelectedLineId(station.lines[0] ?? null)
        map.flyTo([station.lat, station.lng], Math.max(map.getZoom(), 14), { duration: 0.5 })
      })

      markersRef.current.push({ id: station.id, marker })
      bounds.extend([station.lat, station.lng])
    })

    if (bounds.isValid()) map.fitBounds(bounds.pad(0.05))

    // Invalidate size after mount to fix blank tile bug
    setTimeout(() => map.invalidateSize(), 100)

    return () => {
      map.remove()
      mapRef.current = null
      markersRef.current = []
      linesRef.current.clear()
    }
  }, [ready, lines, stations])

  // Update styles on selection change
  useEffect(() => {
    if (!ready) return
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light'

    linesRef.current.forEach((poly, lineId) => {
      let opacity = 0.85, weight = 5
      if (selectedLineId) {
        opacity = lineId === selectedLineId ? 1 : 0.15
        weight = lineId === selectedLineId ? 7 : 3
      }
      poly.setStyle({ opacity, weight })
    })

    markersRef.current.forEach(({ id, marker }) => {
      const station = stationMap.get(id)
      const isSelected = id === selectedStation?.id
      const onLine = selectedLineId ? station?.lines.includes(selectedLineId as MetroLine) : true
      marker.setStyle({
        radius: isSelected ? 9 : 5,
        color: isSelected ? '#0ea5e9' : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'),
        weight: isSelected ? 3 : 1.5,
        fillColor: isSelected ? '#0ea5e9' : (isDark ? '#1e1e1e' : '#ffffff'),
        fillOpacity: onLine ? 1 : 0.25,
        opacity: onLine ? 1 : 0.25,
      })
    })
  }, [selectedLineId, selectedStation, ready])

  return (
    <div className="space-y-3 anim-page">
      {/* Line filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {lines.slice(0, 12).map((line) => (
          <button
            key={line.id}
            onClick={() => setSelectedLineId((prev) => prev === line.id ? null : line.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 10px',
              borderRadius: '999px',
              fontSize: '10px',
              fontWeight: 600,
              cursor: 'pointer',
              background: selectedLineId === line.id ? line.color : 'var(--surface)',
              color: selectedLineId === line.id ? '#fff' : 'var(--text-muted)',
              border: `1px solid ${selectedLineId === line.id ? line.color : 'var(--border)'}`,
              transition: 'all 0.2s ease',
            }}
          >
            <span
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: selectedLineId === line.id ? '#fff' : line.color,
                flexShrink: 0,
              }}
            />
            {line.id}
          </button>
        ))}
        {(selectedLineId || selectedStation) && (
          <button
            onClick={() => { setSelectedLineId(null); setSelectedStation(null) }}
            style={{
              padding: '3px 10px', borderRadius: '999px', fontSize: '10px',
              fontWeight: 600, cursor: 'pointer',
              background: 'var(--surface2)', color: 'var(--text-muted)',
              border: '1px solid var(--border)',
            }}
          >
            Clear ×
          </button>
        )}
      </div>

      {/* Map container */}
      <div
        style={{
          position: 'relative',
          height: '65vh',
          minHeight: '400px',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid var(--border)',
          background: 'var(--surface2)',
        }}
      >
        <div ref={mapDivRef} style={{ height: '100%', width: '100%' }} />

        {!ready && (
          <div
            style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '12px',
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              border: '2px solid var(--border-strong)',
              borderTopColor: 'var(--text)',
              animation: 'spin 0.8s linear infinite',
            }} />
            <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Loading map…</p>
          </div>
        )}
      </div>

      {/* Station info panel — only when a station is selected */}
      {selectedStation && (
        <div
          className="modal-enter rounded-2xl p-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-dim)' }}>
                Selected Station
              </p>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '17px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)', marginTop: '2px' }}>
                {selectedStation.name}
              </h3>
            </div>
            <button
              onClick={() => { setSelectedStation(null); setSelectedLineId(null) }}
              style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)', fontSize: 12, fontWeight: 700,
              }}
            >
              ×
            </button>
          </div>

          {/* Line badges */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {selectedStation.lines.map((line) => (
              <span
                key={line}
                className="rounded-full px-2 py-0.5 text-white"
                style={{ fontSize: '10px', fontWeight: 700, background: getLineHexColor(line as MetroLine) }}
              >
                {line}
              </span>
            ))}
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: 'First Train', value: selectedStation.first },
              { label: 'Last Train', value: selectedStation.last },
              { label: 'Platforms', value: String(selectedStation.platforms) },
              { label: 'Interchanges', value: String(Math.max(0, selectedStation.lines.length - 1)) },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'var(--surface2)', borderRadius: '10px', padding: '10px 12px', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)' }}>{label}</p>
                <p style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'Syne, sans-serif', color: 'var(--text)', marginTop: '2px' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Facilities */}
          {selectedStation.facilities?.length > 0 && (
            <div className="mb-3">
              <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-dim)', marginBottom: '6px' }}>
                Facilities
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selectedStation.facilities.map((f: string) => (
                  <span key={f} style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '999px', background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Nearby */}
          <div>
            <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-dim)', marginBottom: '6px' }}>
              Nearby
            </p>
            {selectedStation.landmarks.slice(0, 3).map((lm) => (
              <a
                key={lm.name}
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lm.name + ' near ' + selectedStation.name)}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 0', borderBottom: '1px solid var(--border)',
                  textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>📍 {lm.name}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{lm.distance} km</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .leaflet-tooltip-custom {
          background: var(--surface) !important;
          border: 1px solid var(--border-strong) !important;
          color: var(--text) !important;
          font-family: 'DM Sans', sans-serif !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          border-radius: 8px !important;
          padding: 4px 10px !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.3) !important;
          white-space: nowrap !important;
        }
        .leaflet-tooltip-custom::before { display: none !important; }
        .leaflet-control-zoom a {
          background: var(--surface) !important;
          color: var(--text) !important;
          border-color: var(--border) !important;
        }
        .leaflet-bar { border: 1px solid var(--border-strong) !important; box-shadow: none !important; }
        .leaflet-control-attribution {
          background: var(--surface) !important;
          color: var(--text-dim) !important;
          font-size: 9px !important;
        }
        .leaflet-control-attribution a { color: var(--text-dim) !important; }
      `}</style>
    </div>
  )
}
