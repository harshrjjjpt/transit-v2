# GTFS-RT Live Data Setup

## 1. Get your API key
- Delhi Metro open data: https://otd.delhi.gov.in
- Register and request GTFS-Realtime access

## 2. Add to `.env.local`
```bash
GTFS_RT_API_KEY=your_key_here
GTFS_RT_FEED_URL=https://otd.delhi.gov.in/api/realtime/VehiclePositions.pb
```

## 3. Supported feed URL formats
The API route injects the API key automatically and accepts these formats:

- Recommended official endpoint (no key in URL):
  - `https://otd.delhi.gov.in/api/realtime/VehiclePositions.pb`
- Full URL with query placeholder:
  - `https://otd.delhi.gov.in/api/realtime/VehiclePositions.pb?key={API_KEY}`
- Full URL with empty key query:
  - `https://otd.delhi.gov.in/api/realtime/VehiclePositions.pb?key=`

The route also attempts automatic fallback path rewrites for common legacy names (for example `VehiclePositionFeed` → `VehiclePositions.pb`) when it receives a 404.

## 4. What the API route does
- `GET /api/gtfs-rt` — fetches, decodes (protobuf → JSON), caches 15s, returns:
  ```json
  {
    "feedTimestamp": 1234567890,
    "counts": { "tripUpdates": 42, "vehicles": 18, "alerts": 2 },
    "tripUpdates": [...],
    "vehicles": [...],
    "alerts": [...]
  }
  ```

## 5. The Live page auto-polls every 15 seconds
- Shows real countdown: "6 min", "Now", "Left"
- Delay badges: +2m (red) / -1m (green)
- Falls back to static GTFS schedule if feed is unavailable

## 6. PWA / Offline
- Service worker caches the app shell, static schedules, and map tiles
- When offline, last GTFS-RT response is served (marked as stale)
- An offline page is shown if completely cold-start offline
