'use client'

import { STATIONS } from '@/lib/data'
import { computeDistanceKm, computeFare } from '@/lib/utils'
import { useTransit } from '@/components/transit-context'

export default function FarePage() {
  const { selectedSource, selectedDestination, setSelectedSource, setSelectedDestination } = useTransit()
  const fare = computeFare(selectedSource, selectedDestination)
  const distance = computeDistanceKm(selectedSource, selectedDestination)
  const smartFare = Math.floor(fare * 0.9)

  const srcName = STATIONS.find(s => s.id === selectedSource)?.name ?? '—'
  const dstName = STATIONS.find(s => s.id === selectedDestination)?.name ?? '—'

  return (
    <div className="space-y-3 animate-slide-up">
      <div>
        <h2 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.03em' }}>Fare Calculator</h2>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-dim)' }}>Estimate your journey cost</p>
      </div>

      {/* Station selectors */}
      <div className="space-y-2">
        {/* From */}
        <div className="relative rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: '#4ade8022', color: 'var(--accent-green)', border: '1px solid #4ade8044' }}>
              A
            </div>
            <div className="flex-1">
              <p className="text-[9px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-dim)' }}>From</p>
              <select value={selectedSource} onChange={(e) => setSelectedSource(e.target.value)} style={{ padding: '4px 8px', borderRadius: '8px', fontSize: '12px', background: 'var(--surface2)' }}>
                {STATIONS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Swap */}
        <div className="flex justify-center">
          <button
            onClick={() => { setSelectedSource(selectedDestination); setSelectedDestination(selectedSource) }}
            className="flex h-7 w-7 items-center justify-center rounded-full transition-all"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
            </svg>
          </button>
        </div>

        {/* To */}
        <div className="relative rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: '#f87171' + '22', color: 'var(--accent-red)', border: '1px solid #f8717144' }}>
              B
            </div>
            <div className="flex-1">
              <p className="text-[9px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-dim)' }}>To</p>
              <select value={selectedDestination} onChange={(e) => setSelectedDestination(e.target.value)} style={{ padding: '4px 8px', borderRadius: '8px', fontSize: '12px', background: 'var(--surface2)' }}>
                {STATIONS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Route summary */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-[9px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-dim)' }}>Journey Summary</p>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-medium truncate">{srcName}</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--text-dim)', flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
          <span className="text-xs font-medium truncate">{dstName}</span>
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-dim)' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>{distance} km</span>
        </div>
      </div>

      {/* Fare cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Token</p>
          <p className="mt-2 text-3xl font-bold" style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.03em' }}>₹{fare}</p>
          <p className="mt-1 text-[10px]" style={{ color: 'var(--text-dim)' }}>Standard fare</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'color-mix(in srgb, var(--accent-blue) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-blue) 20%, transparent)' }}>
          <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: '#4a9eff99' }}>Smart Card</p>
          <p className="mt-2 text-3xl font-bold" style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.03em', color: 'var(--accent-blue)' }}>₹{smartFare}</p>
          <p className="mt-1 text-[10px]" style={{ color: '#4a9eff88' }}>Save 10%</p>
        </div>
      </div>

      {/* Info note */}
      <div className="flex items-start gap-2.5 rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-dim)', marginTop: '1px', flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
          Smart cards offer a 10% discount on all journeys. Recharge at any station or via the app.
        </p>
      </div>
    </div>
  )
}
