import Link from 'next/link'
import { STATIONS } from '@/lib/data'

export default function StationsPage() {
  return (
    <div className="space-y-3 animate-slide-up">
      <div>
        <h2 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.03em' }}>All Stations</h2>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-dim)' }}>{STATIONS.length} stations</p>
      </div>
      <div className="space-y-1.5">
        {STATIONS.map((station) => (
          <Link
            key={station.id}
            href={`/stations/${station.id}`}
            className="flex items-center justify-between rounded-xl px-4 py-3 transition-all"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <p className="text-sm font-medium">{station.name}</p>
            <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{station.lines.join(' · ')}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
