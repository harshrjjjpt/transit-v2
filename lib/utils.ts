import { LINE_STATION_ORDER, STATIONS, type MetroLine } from './data'

export function stationById(id: string) {
  return STATIONS.find((s) => s.id === id) ?? STATIONS[0]
}

export function stationsByIds(ids: string[]) {
  return ids.map(stationById)
}

export function getStationsBetweenOnLine(line: MetroLine, startId: string, endId: string) {
  const orderedIds = LINE_STATION_ORDER[line]
  const start = orderedIds.indexOf(startId)
  const end = orderedIds.indexOf(endId)
  if (start === -1 || end === -1) return [startId, endId]
  if (start <= end) return orderedIds.slice(start, end + 1)
  return [...orderedIds.slice(end, start + 1)].reverse()
}

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function computeDistanceKm(source: string, destination: string) {
  const s = stationById(source)
  const d = stationById(destination)
  return haversine(s.lat, s.lng, d.lat, d.lng).toFixed(1)
}

export function computeFare(source: string, destination: string) {
  const distance = Number(computeDistanceKm(source, destination))
  if (distance <= 2) return 10
  if (distance <= 5) return 20
  if (distance <= 12) return 30
  if (distance <= 21) return 40
  if (distance <= 32) return 50
  return 60
}

export function nearestStation(lat: number, lng: number) {
  return STATIONS.map((station) => ({ ...station, distance: haversine(lat, lng, station.lat, station.lng) })).sort((a, b) => a.distance - b.distance)[0]
}
