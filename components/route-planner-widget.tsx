'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { type Station } from '@/lib/data'
import { stationById } from '@/lib/utils'
import { buildRouteOptions } from '@/lib/route-options'
import { useTransit } from './transit-context'
import StationSearchDropdown from './station-search-dropdown'
import { getLineHexColor } from '@/lib/line-style'

export default function RoutePlannerWidget({ compact = false }: { compact?: boolean }) {
  const router = useRouter()
  const { selectedSource, selectedDestination, setSelectedSource, setSelectedDestination, setSelectedRoute } = useTransit()
  const [showModal, setShowModal] = useState(false)

  const source: Station = stationById(selectedSource)
  const destination: Station = stationById(selectedDestination)
  const routeOptions = useMemo(() => buildRouteOptions(source, destination), [source, destination])

  return (
    <>
      <div className="space-y-2">
        {!compact && (
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 800, letterSpacing: '-0.035em', color: 'var(--text)' }}>
            Route Planner
          </h2>
        )}

        {/* FROM */}
        <div className="flex items-center gap-2.5">
          <div className="flex w-5 shrink-0 flex-col items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--accent-green)', boxShadow: '0 0 6px var(--accent-green)' }} />
            <div className="h-6 w-px" style={{ background: 'var(--border-strong)' }} />
          </div>
          <StationSearchDropdown
            value={selectedSource}
            onChange={setSelectedSource}
            placeholder="From — departure station"
            className="flex-1"
          />
        </div>

        {/* Swap */}
        <div className="flex items-center gap-2.5">
          <div className="flex w-5 justify-center">
            <button
              onClick={() => { setSelectedSource(selectedDestination); setSelectedDestination(selectedSource) }}
              className="flex h-6 w-6 items-center justify-center rounded-full"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border-strong)', cursor: 'pointer' }}
              title="Swap stations"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-dim)' }}>
                <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
              </svg>
            </button>
          </div>
          <p style={{ fontSize: '9px', color: 'var(--text-dim)', fontWeight: 500 }}>swap stations</p>
        </div>

        {/* TO */}
        <div className="flex items-center gap-2.5">
          <div className="flex w-5 shrink-0 flex-col items-center gap-1">
            <div className="h-6 w-px" style={{ background: 'var(--border-strong)' }} />
            <div className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--accent-red)', boxShadow: '0 0 6px var(--accent-red)' }} />
          </div>
          <StationSearchDropdown
            value={selectedDestination}
            onChange={setSelectedDestination}
            placeholder="To — arrival station"
            className="flex-1"
          />
        </div>

        {/* CTA */}
        <button
          onClick={() => setShowModal(true)}
          className="mt-1 w-full rounded-xl py-3 text-sm font-bold transition-all"
          style={{
            background: 'var(--text)',
            color: 'var(--bg)',
            letterSpacing: '-0.01em',
            fontFamily: 'Syne, sans-serif',
          }}
        >
          Find Routes →
        </button>
      </div>

      {/* ── Route Options Modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center"
          style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(14px)' }}
        >
          <div
            className="modal-enter max-h-[88vh] w-full max-w-md overflow-auto rounded-2xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-lg)' }}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div>
                <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '17px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)' }}>
                  Select Route
                </h3>
                <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                  {source.name} → {destination.name}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Route options */}
            <div className="space-y-2 p-4">
              {routeOptions.map((route, idx) => {
                const isBest = idx === 0
                const primaryLineColor = route.lines[0] ? getLineHexColor(route.lines[0]) : 'var(--text-dim)'

                return (
                  <article
                    key={route.id}
                    className="rounded-xl overflow-hidden"
                    style={{
                      background: isBest ? 'var(--surface2)' : 'var(--surface)',
                      border: `1px solid ${isBest ? 'var(--border-strong)' : 'var(--border)'}`,
                    }}
                  >
                    {/* Color accent top bar */}
                    <div className="h-[2px]" style={{ background: primaryLineColor, opacity: 0.8 }} />

                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                            {route.title}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {route.lines.map((line) => (
                              <span
                                key={line}
                                className="rounded-full px-2 py-0.5 text-white"
                                style={{
                                  fontSize: '9px',
                                  fontWeight: 700,
                                  background: getLineHexColor(line),
                                  letterSpacing: '0.02em',
                                }}
                              >
                                {line}
                              </span>
                            ))}
                          </div>
                        </div>
                        {isBest && (
                          <span
                            className="rounded-full px-2 py-0.5"
                            style={{ fontSize: '9px', fontWeight: 700, background: 'var(--accent-green)', color: '#000', opacity: 0.9 }}
                          >
                            Best
                          </span>
                        )}
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center gap-3 mb-4">
                        {[
                          { label: 'Time', value: `${route.etaMin}m` },
                          { label: 'Fare', value: `₹${route.fare}` },
                          { label: 'Type', value: route.difficulty },
                        ].map(({ label, value }, i) => (
                          <div key={label} className="flex items-center gap-3">
                            {i > 0 && <div className="h-6 w-px" style={{ background: 'var(--border)' }} />}
                            <div>
                              <p style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)' }}>{label}</p>
                              <p style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'Syne, sans-serif', color: 'var(--text)', marginTop: '1px' }}>{value}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => {
                          setSelectedRoute({ title: route.title, lines: route.lines, stationIds: route.stationIds, etaMin: route.etaMin, fare: route.fare })
                          setShowModal(false)
                          router.push('/route/result')
                        }}
                        className="w-full rounded-xl py-2.5 text-sm font-bold transition-all"
                        style={{
                          background: isBest ? 'var(--text)' : 'var(--surface2)',
                          color: isBest ? 'var(--bg)' : 'var(--text)',
                          border: isBest ? 'none' : '1px solid var(--border)',
                          fontFamily: 'Syne, sans-serif',
                          cursor: 'pointer',
                        }}
                      >
                        {isBest ? 'Use This Route →' : 'Select'}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
