import { type MetroLine } from './data'
import { stationsByIds } from './utils'

export function lineFamily(line: MetroLine): string {
  return line.split('_')[0] ?? line
}

export function segmentLinesForPath(stationIds: string[]): MetroLine[] {
  const stations = stationsByIds(stationIds)
  const lines: MetroLine[] = []
  let activeLine: MetroLine | undefined

  for (let i = 0; i < stations.length - 1; i += 1) {
    const a = stations[i]
    const b = stations[i + 1]
    const common = a.lines.filter((line) => b.lines.includes(line)) as MetroLine[]
    const activeFamily = activeLine ? lineFamily(activeLine) : undefined
    const keepFamily = activeFamily ? common.find((line) => lineFamily(line) === activeFamily) : undefined
    const selected = keepFamily ?? common[0] ?? a.lines[0]
    lines.push(selected)
    activeLine = selected
  }

  return lines
}

export function routeLinesFromSegments(segmentLines: MetroLine[]): MetroLine[] {
  const lines: MetroLine[] = []
  for (const line of segmentLines) {
    if (lines.length === 0 || lineFamily(lines[lines.length - 1]) !== lineFamily(line)) {
      lines.push(line)
    }
  }
  return lines
}

export function transferStationsForPath(stationIds: string[], segmentLines: MetroLine[]): Set<string> {
  const transfers = new Set<string>()
  for (let i = 1; i < segmentLines.length; i += 1) {
    if (lineFamily(segmentLines[i - 1]) !== lineFamily(segmentLines[i])) {
      transfers.add(stationIds[i])
    }
  }
  return transfers
}

