import { LINE_OPTIONS, LINE_STATION_ORDER, type MetroLine, type Station } from './data'
import { computeDistanceKm, computeFare } from './utils'
import { getLineBadgeClass } from './line-style'
import { routeLinesFromSegments, segmentLinesForPath } from './route-logic'

export type RouteOption = {
  id: string
  title: string
  lines: MetroLine[]
  steps: string[]
  stationIds: string[]
  etaMin: number
  fare: number
  difficulty: 'Easy' | 'Medium' | 'Simple'
}

export const LINE_BADGE = new Proxy({} as Record<MetroLine, string>, {
  get: (_, line: string) => getLineBadgeClass(line),
})

const adjacency = new Map<string, Set<string>>()
for (const stopIds of Object.values(LINE_STATION_ORDER)) {
  for (let i = 1; i < stopIds.length; i += 1) {
    const a = stopIds[i - 1]
    const b = stopIds[i]
    if (!adjacency.has(a)) adjacency.set(a, new Set())
    if (!adjacency.has(b)) adjacency.set(b, new Set())
    adjacency.get(a)?.add(b)
    adjacency.get(b)?.add(a)
  }
}

function shortestPath(sourceId: string, destId: string) {
  if (sourceId === destId) return [sourceId]
  const queue = [sourceId]
  const parent = new Map<string, string | null>([[sourceId, null]])

  while (queue.length > 0) {
    const current = queue.shift() as string
    if (current === destId) break
    for (const next of adjacency.get(current) ?? []) {
      if (parent.has(next)) continue
      parent.set(next, current)
      queue.push(next)
    }
  }

  if (!parent.has(destId)) return [sourceId, destId]
  const path: string[] = []
  let cur: string | null = destId
  while (cur) {
    path.push(cur)
    cur = parent.get(cur) ?? null
  }
  return path.reverse()
}

function buildRouteOption(id: string, title: string, stationIds: string[], source: Station, destination: Station, baseEta: number, fare: number): RouteOption {
  const segmentLines = segmentLinesForPath(stationIds)
  const routeLines = routeLinesFromSegments(segmentLines)

  return {
    id,
    title,
    lines: routeLines.length > 0 ? routeLines : [LINE_OPTIONS[0]],
    steps: [source.name, ...routeLines.map((line, idx) => (idx === routeLines.length - 1 ? `Continue on ${line}` : `Interchange to ${line}`)), destination.name],
    stationIds,
    etaMin: baseEta + Math.max(0, routeLines.length - 1) * 4,
    fare,
    difficulty: routeLines.length > 2 ? 'Medium' : 'Easy',
  }
}

function pathViaInterchange(sourceId: string, destinationId: string, interchangeId: string): string[] {
  const first = shortestPath(sourceId, interchangeId)
  const second = shortestPath(interchangeId, destinationId)
  if (first.length < 2 || second.length < 2) return []
  return [...first, ...second.slice(1)]
}

export function buildRouteOptions(source: Station, destination: Station): RouteOption[] {
  const distance = Number(computeDistanceKm(source.id, destination.id))
  const baseEta = Math.max(8, Math.round(distance * 2.6))
  const fare = computeFare(source.id, destination.id)

  const fastestPath = shortestPath(source.id, destination.id)
  const fastest = buildRouteOption('fastest', 'GTFS Fastest Available Route', fastestPath, source, destination, baseEta, fare)

  const options: RouteOption[] = [fastest]
  const seenPaths = new Set([fastestPath.join('>')])

  const rajivPath = pathViaInterchange(source.id, destination.id, '50')
  if (rajivPath.length > 0) {
    const key = rajivPath.join('>')
    if (!seenPaths.has(key)) {
      seenPaths.add(key)
      options.push({
        ...buildRouteOption('via-rajiv-chowk', 'Alternative via Rajiv Chowk', rajivPath, source, destination, baseEta + 2, fare),
        difficulty: 'Simple',
      })
    }
  }

  const comfort: RouteOption = {
    ...fastest,
    id: 'comfort',
    title: 'Comfort Route (Fewer Rush Changes)',
    etaMin: fastest.etaMin + 4,
    difficulty: 'Simple',
  }

  if (!seenPaths.has(comfort.stationIds.join('>'))) {
    options.push(comfort)
  }

  if (options.length === 1) options.push(comfort)
  return options
}
