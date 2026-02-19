import { notFound } from 'next/navigation'
import { Card } from '@/components/ui'
import { STATIONS, STATION_SCHEDULES } from '@/lib/data'

export default function StationDetailPage({ params }: { params: { id: string } }) {
  const station = STATIONS.find((s) => s.id === params.id)
  if (!station) return notFound()
  const schedules = STATION_SCHEDULES[station.id] ?? []

  return (
    <section className="grid gap-3 rounded-2xl border border-white/70 bg-white/75 p-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card title="StationHeader"><p>{station.name}</p><p className="text-xs text-slate-500">{station.lines.join(' / ')}</p></Card>
      <Card title="TimingsCard"><p>First: {station.first}</p><p>Last: {station.last}</p></Card>
      <Card title="PlatformInfoCard"><p>Platforms: {station.platforms}</p><p>Gates: 1-6</p></Card>
      <Card title="FacilitiesGrid">{station.facilities.map((f) => <span key={f} className="mr-1 inline-block rounded border border-violet-200 bg-violet-100 px-2 py-1 text-xs">{f}</span>)}</Card>
      <Card title="Scheduled Departures">
        <div className="space-y-2 text-xs text-slate-700">
          {schedules.slice(0, 5).map((schedule) => (
            <div key={schedule.line} className="rounded-lg border border-slate-200 p-2">
              <p className="font-semibold">{schedule.line} • {schedule.headsign || 'Service'}</p>
              <p>{schedule.departures.slice(0, 4).join(' • ')}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card title="LiveArrivalsButton"><button className="rounded-lg bg-gradient-to-r from-sky-300 to-fuchsia-300 px-3 py-2 text-xs font-semibold text-slate-700">Open Live Arrivals</button></Card>
    </section>
  )
}
