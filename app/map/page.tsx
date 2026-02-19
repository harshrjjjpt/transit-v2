import InteractiveMetroMap from '@/components/interactive-metro-map'

export default function MapPage() {
  return (
    <div className="space-y-3 animate-slide-up">
      <div>
        <h2 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.03em' }}>Metro Map</h2>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-dim)' }}>All lines & stations</p>
      </div>
      <InteractiveMetroMap />
    </div>
  )
}
