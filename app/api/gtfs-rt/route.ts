import { NextResponse } from 'next/server'
import { decodeGtfsRtFeed } from '@/lib/gtfs-rt-decoder'

// ── In-memory cache — avoids hammering the GTFS-RT endpoint ────────────────
type ShapedGtfsResponse = ReturnType<typeof shapeFeed>

let cache: { data: ShapedGtfsResponse; fetchedAt: number } | null = null

const CACHE_TTL_MS = 15_000 // 15 seconds — GTFS-RT updates ~every 15-30s

// ── Fetch and decode the live feed ─────────────────────────────────────────
async function fetchLiveFeed() {
  const apiKey = process.env.GTFS_RT_API_KEY
  const feedUrl = process.env.GTFS_RT_FEED_URL

  if (!apiKey || !feedUrl) {
    throw new Error('GTFS_RT_API_KEY and GTFS_RT_FEED_URL must be set in environment variables.')
  }

  const candidateUrls = buildFeedUrlCandidates(feedUrl, apiKey)
  const errors: string[] = []

  for (const urlWithKey of candidateUrls) {
    const res = await fetch(urlWithKey, {
      headers: {
        'x-api-key': apiKey,
        Accept: 'application/octet-stream',
      },
      next: { revalidate: 0 }, // never use Next.js cache — we do our own
    })

    if (res.ok) {
      const buffer = await res.arrayBuffer()
      const feed = decodeGtfsRtFeed(new Uint8Array(buffer))
      return feed
    }

    errors.push(`${res.status} ${res.statusText} @ ${urlWithKey}`)

    // Only try fallbacks for not found paths. For auth/rate-limit/etc, fail fast.
    if (res.status !== 404) {
      break
    }
  }

  throw new Error(`GTFS-RT fetch failed: ${errors.join(' | ')}`)
}

function buildFeedUrlCandidates(feedUrl: string, apiKey: string) {
  const candidates = new Set<string>()

  // 1) URL exactly as provided (with key injected)
  candidates.add(buildFeedUrl(feedUrl, apiKey))

  // 2) Correct common legacy path names from older docs/code snippets
  candidates.add(buildFeedUrl(rewriteLegacyFeedPath(feedUrl), apiKey))

  // 3) If user provided only /api/realtime base path, default to VehiclePositions
  const realtimeBase = /^https?:\/\/[^/]+\/api\/realtime\/?$/i
  if (realtimeBase.test(feedUrl)) {
    candidates.add(buildFeedUrl(`${feedUrl.replace(/\/?$/, '')}/VehiclePositions.pb`, apiKey))
  }

  return [...candidates]
}

function rewriteLegacyFeedPath(feedUrl: string) {
  return feedUrl
    .replace(/VehiclePositionFeed\b/i, 'VehiclePositions.pb')
    .replace(/VehiclePosition\b/i, 'VehiclePositions.pb')
    .replace(/TripUpdateFeed\b/i, 'TripUpdates.pb')
    .replace(/TripUpdate\b/i, 'TripUpdates.pb')
    .replace(/AlertFeed\b/i, 'Alerts.pb')
    .replace(/Alert\b/i, 'Alerts.pb')
}

function buildFeedUrl(feedUrl: string, apiKey: string) {
  if (feedUrl.includes('{API_KEY}')) {
    return feedUrl.replaceAll('{API_KEY}', encodeURIComponent(apiKey))
  }

  const url = new URL(feedUrl)

  // Common provider format: ...?key=
  if (url.searchParams.get('key') !== apiKey) {
    url.searchParams.set('key', apiKey)
  }

  return url.toString()
}

// ── Shape the raw feed into a clean API response ───────────────────────────
function shapeFeed(feed: ReturnType<typeof decodeGtfsRtFeed>) {
  const now = Math.floor(Date.now() / 1000)

  // TripUpdates — arrival/departure times per stop
  const tripUpdates = feed.entity
    .filter((e) => e.trip_update && !e.is_deleted)
    .map((e) => {
      const tu = e.trip_update!
      return {
        entityId: e.id,
        tripId: tu.trip.trip_id,
        routeId: tu.trip.route_id,
        directionId: tu.trip.direction_id,
        startTime: tu.trip.start_time,
        startDate: tu.trip.start_date,
        vehicleId: tu.vehicle?.id,
        stopTimeUpdates: tu.stop_time_update.map((stu) => ({
          stopId: stu.stop_id,
          stopSequence: stu.stop_sequence,
          arrival: stu.arrival
            ? {
                delay: stu.arrival.delay ?? 0,
                time: stu.arrival.time,
                // minutes until arrival (negative = already passed)
                minutesAway: stu.arrival.time
                  ? Math.round((stu.arrival.time - now) / 60)
                  : undefined,
              }
            : undefined,
          departure: stu.departure
            ? {
                delay: stu.departure.delay ?? 0,
                time: stu.departure.time,
                minutesAway: stu.departure.time
                  ? Math.round((stu.departure.time - now) / 60)
                  : undefined,
              }
            : undefined,
        })),
      }
    })

  // VehiclePositions — live train locations on map
  const vehicles = feed.entity
    .filter((e) => e.vehicle && !e.is_deleted)
    .map((e) => {
      const v = e.vehicle!
      return {
        entityId: e.id,
        vehicleId: v.vehicle?.id ?? e.id,
        vehicleLabel: v.vehicle?.label,
        tripId: v.trip?.trip_id,
        routeId: v.trip?.route_id,
        directionId: v.trip?.direction_id,
        latitude: v.position?.latitude,
        longitude: v.position?.longitude,
        bearing: v.position?.bearing,
        speed: v.position?.speed,
        stopId: v.stop_id,
        currentStopSequence: v.current_stop_sequence,
        // 0=INCOMING_AT, 1=STOPPED_AT, 2=IN_TRANSIT_TO
        status: v.current_status ?? 2,
        statusLabel:
          v.current_status === 0 ? 'Approaching'
          : v.current_status === 1 ? 'Stopped'
          : 'In transit',
        timestamp: v.timestamp,
        secondsAgo: v.timestamp ? now - v.timestamp : undefined,
      }
    })

  // Service Alerts
  const alerts = feed.entity
    .filter((e) => e.alert && !e.is_deleted)
    .map((e) => {
      const a = e.alert!
      const CAUSE_LABELS: Record<number, string> = {
        1: 'Unknown', 2: 'Other', 3: 'Technical problem', 4: 'Strike', 5: 'Demonstration',
        6: 'Accident', 7: 'Holiday', 8: 'Weather', 9: 'Maintenance', 10: 'Construction',
        11: 'Police activity', 12: 'Medical emergency',
      }
      const EFFECT_LABELS: Record<number, string> = {
        1: 'No service', 2: 'Reduced service', 3: 'Significant delays', 4: 'Detour',
        5: 'Additional service', 6: 'Modified service', 7: 'Other effect', 8: 'Unknown effect',
        9: 'Stop moved', 10: 'No effect', 11: 'Accessibility issue',
      }
      return {
        entityId: e.id,
        headerText: a.header_text ?? '',
        descriptionText: a.description_text ?? '',
        cause: CAUSE_LABELS[a.cause ?? 1] ?? 'Unknown',
        effect: EFFECT_LABELS[a.effect ?? 8] ?? 'Unknown effect',
        affectedRoutes: a.informed_entity?.map((ie) => ie.route_id).filter(Boolean) ?? [],
        affectedStops: a.informed_entity?.map((ie) => ie.stop_id).filter(Boolean) ?? [],
        activePeriod: a.active_period,
      }
    })

  return {
    feedTimestamp: feed.header.timestamp,
    fetchedAt: now,
    counts: { tripUpdates: tripUpdates.length, vehicles: vehicles.length, alerts: alerts.length },
    tripUpdates,
    vehicles,
    alerts,
  }
}

// ── Route handler ──────────────────────────────────────────────────────────
export async function GET() {
  try {
    const now = Date.now()

    // Serve cache if fresh
    if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
      return NextResponse.json(cache.data, {
        headers: {
          'Cache-Control': 'public, max-age=15',
          'X-Cache': 'HIT',
        },
      })
    }

    const feed = await fetchLiveFeed()
    const shaped = shapeFeed(feed)

    cache = { data: shaped, fetchedAt: now }

    return NextResponse.json(shaped, {
      headers: {
        'Cache-Control': 'public, max-age=15',
        'X-Cache': 'MISS',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[GTFS-RT]', message)

    // Return stale cache rather than a hard error if available
    if (cache) {
      return NextResponse.json(
        { ...cache.data, stale: true, error: message },
        { status: 200, headers: { 'X-Cache': 'STALE' } }
      )
    }

    return NextResponse.json(
      { error: message, tripUpdates: [], vehicles: [], alerts: [] },
      { status: 503 }
    )
  }
}

// Export types for the client
export type { GtfsRtData } from '@/hooks/use-gtfs-rt'
