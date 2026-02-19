import { LIVE_ALERTS } from '@/lib/data'

export default function AlertsPage() {
  return (
    <div className="space-y-3 animate-slide-up">
      <div>
        <h2 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.03em' }}>Service Alerts</h2>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-dim)' }}>Live service updates</p>
      </div>

      <div className="space-y-2">
        {LIVE_ALERTS.map((a, i) => (
          <div key={a} className="flex items-start gap-3 rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm" style={{ background: 'color-mix(in srgb, var(--accent-yellow) 12%, transparent)', color: 'var(--accent-yellow)' }}>
              ⚡
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'color-mix(in srgb, var(--accent-yellow) 68%, transparent)' }}>Alert {i + 1}</p>
              <p className="text-sm">{a}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-[9px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>System Info</p>
        <div className="space-y-1.5">
          {['API: /api/routes, /api/fare, /api/live', 'Static data cached in DB', 'Realtime polling every 30–60s', 'Redis cache for live board'].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full" style={{ background: 'var(--text-dim)' }} />
              <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{item}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
