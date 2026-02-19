import { LINE_DETAILS, type MetroLine } from './data'

// Proper Delhi Metro line color families
const FAMILY_COLORS: Record<string, string> = {
  A: '#00BCD4', // AQUA line
  B: '#2196F3', // BLUE line
  G: '#4CAF50', // GREEN/GRAY line (green takes priority)
  M: '#E91E63', // MAGENTA line
  O: '#FF9800', // ORANGE/AIRPORT line
  P: '#EC407A', // PINK line
  R: '#F44336', // RED line
  V: '#9C27B0', // VIOLET line
  Y: '#FFC107', // YELLOW line
}

const FALLBACK_HEX = ['#2196F3', '#E91E63', '#4CAF50', '#FF9800', '#9C27B0', '#EC407A']
const FALLBACK_BADGE = [
  'bg-sky-100 text-sky-700 border-sky-200',
  'bg-pink-100 text-pink-700 border-pink-200',
  'bg-green-100 text-green-800 border-green-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-violet-100 text-violet-800 border-violet-200',
  'bg-rose-100 text-rose-800 border-rose-200',
]

const colorByLine = new Map(LINE_DETAILS.map((line) => [line.line, line.color]))

function hashLine(line: MetroLine) {
  return [...line].reduce((acc, char) => acc + char.charCodeAt(0), 0)
}

function lineFamily(line: MetroLine): string {
  // e.g. "B_DN" => "B", "G_IB" => "G"
  const prefix = line.split('_')[0] ?? line
  return prefix
}

export function getLineHexColor(line: MetroLine) {
  const family = lineFamily(line)
  const familyColor = FAMILY_COLORS[family]
  if (familyColor) return familyColor
  return colorByLine.get(line) ?? FALLBACK_HEX[hashLine(line) % FALLBACK_HEX.length]
}

export function getLineBadgeClass(line: MetroLine) {
  return FALLBACK_BADGE[hashLine(line) % FALLBACK_BADGE.length]
}

// Human-readable line name from code
export function getLineName(line: MetroLine): string {
  const family = lineFamily(line)
  const names: Record<string, string> = {
    A: 'Aqua', B: 'Blue', G: 'Green', M: 'Magenta',
    O: 'Orange', P: 'Pink', R: 'Red', V: 'Violet', Y: 'Yellow',
  }
  return names[family] ?? line
}
