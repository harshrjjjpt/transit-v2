# GTFS-RT Live Data Setup

## 1. Get your API key
- Delhi Metro open data: https://otd.delhi.gov.in
- Register and request GTFS-Realtime access

## 2. Add to .env.local (copy from .env.local.example)
```
GTFS_RT_API_KEY=your_key_here
GTFS_RT_FEED_URL=https://otd.delhi.gov.in/api/realtime/VehiclePositionFeed?key=
```

## 3. Feed URL format
The API route appends the key automatically. Set FEED_URL to the base URL ending in `?key=`

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
