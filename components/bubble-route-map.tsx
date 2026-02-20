'use client'

import Script from 'next/script'
import { useEffect, useRef, useState } from 'react'
import { stationsByIds } from '@/lib/utils'
import { transferStationsForPath, segmentLinesForPath } from '@/lib/route-logic'
import type { MetroLine } from '@/lib/data'
import { getLineHexColor } from '@/lib/line-style'

declare global {
  interface Window { d3?: any }
}

export default function BubbleRouteMap({
  stationIds,
  playerStationId,
  activeSegmentIndex,
  activeSegmentRatio,
  distanceToNextMeters,
}: {
  stationIds: string[]
  playerStationId?: string
  activeSegmentIndex?: number
  activeSegmentRatio?: number
  distanceToNextMeters?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [d3Ready, setD3Ready] = useState(false)

  useEffect(() => {
    if (!d3Ready || !window.d3 || !ref.current) return

    const d3 = window.d3
    const stations = stationsByIds(stationIds)
    if (!stations.length) return

    const segmentLines = segmentLinesForPath(stationIds)
    const transferStations = transferStationsForPath(stationIds, segmentLines)

    const NODE_SPACING = 110
    const width = Math.max(360, stations.length * NODE_SPACING)
    const HEIGHT = 200
    const CY = 88 // center y for the track

    d3.select(ref.current).selectAll('*').remove()

    const svg = d3
      .select(ref.current)
      .append('svg')
      .attr('width', width)
      .attr('height', HEIGHT)
      .attr('viewBox', `0 0 ${width} ${HEIGHT}`)

    // ── Defs ──
    const defs = svg.append('defs')

    // Glow filter
    const glow = defs.append('filter').attr('id', 'glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%')
    glow.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur')
    const merge = glow.append('feMerge')
    merge.append('feMergeNode').attr('in', 'blur')
    merge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Player pulse filter
    const pulse = defs.append('filter').attr('id', 'pulse').attr('x', '-80%').attr('y', '-80%').attr('width', '260%').attr('height', '260%')
    pulse.append('feGaussianBlur').attr('stdDeviation', '5').attr('result', 'blur')
    const pm = pulse.append('feMerge')
    pm.append('feMergeNode').attr('in', 'blur')
    pm.append('feMergeNode').attr('in', 'SourceGraphic')

    const x = d3.scalePoint().domain(stations.map((s: any) => s.id)).range([60, width - 60])

    // ── Track background pill ──
    svg.append('rect')
      .attr('x', 40).attr('y', CY - 20)
      .attr('width', width - 80).attr('height', 40)
      .attr('rx', 20)
      .attr('fill', '#1a1a1a')

    // ── Segment lines ──
    for (let i = 0; i < stations.length - 1; i++) {
      const color = getLineHexColor(segmentLines[i])
      svg.append('line')
        .attr('x1', x(stations[i].id)).attr('y1', CY)
        .attr('x2', x(stations[i + 1].id)).attr('y2', CY)
        .attr('stroke', color)
        .attr('stroke-width', 8)
        .attr('stroke-linecap', 'round')
        .attr('opacity', 0.85)
    }

    // ── Progress overlay (traveled) ──
    const playerIndex = playerStationId ? stations.findIndex((s: any) => s.id === playerStationId) : -1
    const hasActiveSegment = typeof activeSegmentIndex === 'number'
      && activeSegmentIndex >= 0
      && activeSegmentIndex < stations.length - 1
      && typeof activeSegmentRatio === 'number'

    const playerX = hasActiveSegment
      ? (x(stations[activeSegmentIndex].id) + ((x(stations[activeSegmentIndex + 1].id) - x(stations[activeSegmentIndex].id) ) * Math.max(0, Math.min(1, activeSegmentRatio))))
      : (playerIndex >= 0 ? x(stations[playerIndex].id) : undefined)

    if (playerIndex > 0) {
      svg.append('line')
        .attr('x1', x(stations[0].id)).attr('y1', CY)
        .attr('x2', playerX).attr('y2', CY)
        .attr('stroke', '#4ade80')
        .attr('stroke-width', 4)
        .attr('stroke-linecap', 'round')
        .attr('opacity', 0.9)
    }

    if (playerX !== undefined) {
      const bubble = svg.append('g').attr('transform', `translate(${playerX}, ${CY - 34})`)
      bubble.append('rect')
        .attr('x', -56)
        .attr('y', -18)
        .attr('width', 112)
        .attr('height', 22)
        .attr('rx', 11)
        .attr('fill', '#4ade80')
        .attr('opacity', 0.15)
      bubble.append('text')
        .attr('text-anchor', 'middle')
        .attr('y', -3)
        .attr('font-size', 9)
        .attr('font-weight', 700)
        .attr('fill', '#4ade80')
        .text(typeof distanceToNextMeters === 'number' ? `${distanceToNextMeters}m to next` : 'Tracking…')
    }

    // ── Station nodes ──
    const node = svg.selectAll('g.node')
      .data(stations)
      .enter()
      .append('g')
      .attr('transform', (d: any) => `translate(${x(d.id)}, ${CY})`)

    const isFirst = (_: any, i: number) => i === 0
    const isLast = (_: any, i: number) => i === stations.length - 1
    const isPlayer = (d: any) => d.id === playerStationId

    // Outer ring for terminals
    node.filter((_: any, i: number) => i === 0 || i === stations.length - 1)
      .append('circle')
      .attr('r', 20)
      .attr('fill', 'none')
      .attr('stroke', (d: any, i: number) => i === 0 ? '#4ade80' : '#f87171')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.4)

    // Transfer ring
    node.filter((d: any) => transferStations.has(d.id) && d.id !== playerStationId)
      .append('circle')
      .attr('r', 16)
      .attr('fill', 'none')
      .attr('stroke', '#FFC107')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '3 3')

    // Main dot
    node.append('circle')
      .attr('r', (d: any, i: number) => {
        if (isPlayer(d)) return 14
        if (isFirst(d, i) || isLast(d, i)) return 12
        if (transferStations.has(d.id)) return 10
        return 7
      })
      .attr('fill', (d: any, i: number) => {
        if (isPlayer(d)) return '#4ade80'
        if (isFirst(d, i)) return '#e0e0e0'
        if (isLast(d, i)) return '#f87171'
        if (transferStations.has(d.id)) return '#FFC107'
        return getLineHexColor(segmentLines[Math.min(i, segmentLines.length - 1)])
      })
      .attr('stroke', (d: any) => isPlayer(d) ? '#0a0a0a' : 'none')
      .attr('stroke-width', 2)
      .attr('filter', (d: any) => isPlayer(d) ? 'url(#pulse)' : (transferStations.has(d.id) ? 'url(#glow)' : null))

    // Inner dot for player
    node.filter(isPlayer)
      .append('circle')
      .attr('r', 5)
      .attr('fill', '#0a0a0a')

    // Top labels (YOU / START / END / CHANGE)
    node.append('text')
      .attr('y', -24)
      .attr('text-anchor', 'middle')
      .attr('font-size', 9)
      .attr('font-weight', 700)
      .attr('letter-spacing', '0.08em')
      .attr('fill', (d: any, i: number) => {
        if (isPlayer(d)) return '#4ade80'
        const light = document.documentElement.getAttribute('data-theme') === 'light'
        if (isFirst(d, i)) return light ? '#777' : '#aaaaaa'
        if (isLast(d, i)) return '#f87171'
        if (transferStations.has(d.id)) return '#FFC107'
        return 'transparent'
      })
      .text((d: any, i: number) => {
        if (isPlayer(d)) return 'YOU'
        if (isFirst(d, i)) return 'START'
        if (isLast(d, i)) return 'END'
        if (transferStations.has(d.id)) return 'CHANGE'
        return ''
      })

    // Station name bottom
    node.append('text')
      .attr('y', 32)
      .attr('text-anchor', 'middle')
      .attr('font-size', 9.5)
      .attr('fill', (d: any, i: number) => { const light = document.documentElement.getAttribute('data-theme') === 'light'; return isPlayer(d) ? (light ? '#111' : '#f0f0f0') : (isFirst(d, i) || isLast(d, i) ? (light ? '#555' : '#cccccc') : (light ? '#999' : '#666666')); })
      .attr('font-weight', (d: any) => isPlayer(d) ? 700 : 400)
      .text((d: any) => {
        const words = d.name.split(' ')
        return words.length > 2 ? words.slice(0, 2).join(' ') + '…' : d.name
      })

    // ── Legend ──
    const uniqueLines: MetroLine[] = Array.from(new Set(segmentLines))
    const legend = svg.append('g').attr('transform', `translate(8, ${HEIGHT - 22})`)
    uniqueLines.forEach((line, idx) => {
      const g = legend.append('g').attr('transform', `translate(${idx * 90}, 0)`)
      g.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 16).attr('y2', 0).attr('stroke', getLineHexColor(line)).attr('stroke-width', 3).attr('stroke-linecap', 'round')
      g.append('text').attr('x', 20).attr('y', 4).attr('font-size', 9).attr('fill', document.documentElement.getAttribute('data-theme') === 'light' ? '#888' : '#666').text(line)
    })
  }, [d3Ready, stationIds, playerStationId, activeSegmentIndex, activeSegmentRatio, distanceToNextMeters])

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/d3@7"
        strategy="afterInteractive"
        onLoad={() => setD3Ready(true)}
      />
      <div
        style={{
          overflowX: 'auto',
          borderRadius: '14px',
          background: '#0e0e0e',
          border: '1px solid rgba(255,255,255,0.06)',
          padding: '12px 4px 8px',
        }}
      >
        <div ref={ref} style={{ minWidth: 'fit-content' }} />
        {!d3Ready && (
          <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: 11, color: 'var(--text-dim)' }}>Loading map…</p>
          </div>
        )}
      </div>
    </>
  )
}
