/**
 * Minimal GTFS-RT protobuf decoder — no external dependencies.
 * Decodes the subset of proto2 fields used by GTFS-Realtime v2:
 *   FeedMessage → FeedHeader + FeedEntity[]
 *   FeedEntity  → TripUpdate | VehiclePosition | Alert
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface GtfsRtFeed {
  header: {
    gtfs_realtime_version: string
    timestamp: number
  }
  entity: GtfsRtEntity[]
}

export interface GtfsRtEntity {
  id: string
  is_deleted?: boolean
  trip_update?: TripUpdate
  vehicle?: VehiclePosition
  alert?: ServiceAlert
}

export interface TripUpdate {
  trip: TripDescriptor
  vehicle?: { id?: string; label?: string }
  stop_time_update: StopTimeUpdate[]
  timestamp?: number
}

export interface StopTimeUpdate {
  stop_sequence?: number
  stop_id: string
  arrival?: { delay?: number; time?: number }
  departure?: { delay?: number; time?: number }
  schedule_relationship?: number
}

export interface VehiclePosition {
  trip?: TripDescriptor
  vehicle?: { id?: string; label?: string }
  position?: { latitude: number; longitude: number; bearing?: number; speed?: number }
  current_stop_sequence?: number
  stop_id?: string
  current_status?: number // 0=INCOMING, 1=STOPPED, 2=IN_TRANSIT
  timestamp?: number
}

export interface ServiceAlert {
  active_period?: { start?: number; end?: number }[]
  informed_entity?: { route_id?: string; stop_id?: string; trip?: TripDescriptor }[]
  cause?: number
  effect?: number
  header_text?: string
  description_text?: string
}

export interface TripDescriptor {
  trip_id?: string
  route_id?: string
  direction_id?: number
  start_time?: string
  start_date?: string
  schedule_relationship?: number
}

// ── Protobuf wire-type constants ────────────────────────────────────────────

const WIRE_VARINT = 0
const WIRE_64BIT  = 1
const WIRE_LEN    = 2
const WIRE_32BIT  = 5

// ── Low-level reader ────────────────────────────────────────────────────────

class ProtoReader {
  private pos = 0
  constructor(private buf: Uint8Array) {}

  get done() { return this.pos >= this.buf.length }
  get position() { return this.pos }

  readVarint(): number {
    let result = 0, shift = 0
    while (true) {
      const b = this.buf[this.pos++]
      result |= (b & 0x7f) << shift
      if (!(b & 0x80)) return result >>> 0
      shift += 7
      if (shift >= 32) {
        // consume remaining bytes of 64-bit varint, return lower 32 bits
        while (this.buf[this.pos++] & 0x80) {}
        return result >>> 0
      }
    }
  }

  readTag(): { field: number; wire: number } {
    const tag = this.readVarint()
    return { field: tag >>> 3, wire: tag & 0x7 }
  }

  readBytes(): Uint8Array {
    const len = this.readVarint()
    const slice = this.buf.slice(this.pos, this.pos + len)
    this.pos += len
    return slice
  }

  readString(): string {
    return new TextDecoder().decode(this.readBytes())
  }

  readFloat(): number {
    const view = new DataView(this.buf.buffer, this.buf.byteOffset + this.pos, 4)
    this.pos += 4
    return view.getFloat32(0, true)
  }

  readDouble(): number {
    const view = new DataView(this.buf.buffer, this.buf.byteOffset + this.pos, 8)
    this.pos += 8
    return view.getFloat64(0, true)
  }

  skip(wire: number) {
    switch (wire) {
      case WIRE_VARINT: this.readVarint(); break
      case WIRE_64BIT:  this.pos += 8; break
      case WIRE_LEN:    this.pos += this.readVarint(); break
      case WIRE_32BIT:  this.pos += 4; break
    }
  }

  slice(len: number): ProtoReader {
    const sub = new ProtoReader(this.buf.slice(this.pos, this.pos + len))
    this.pos += len
    return sub
  }

  subReader(): ProtoReader {
    const len = this.readVarint()
    return this.slice(len)
  }
}

// ── Field-by-field decoders ────────────────────────────────────────────────

function decodeTranslatedString(r: ProtoReader): string {
  let text = ''
  while (!r.done) {
    const { field, wire } = r.readTag()
    if (field === 1 && wire === WIRE_LEN) {
      const sub = r.subReader()
      while (!sub.done) {
        const t = sub.readTag()
        if (t.field === 1 && t.wire === WIRE_LEN) text = sub.readString()
        else sub.skip(t.wire)
      }
    } else r.skip(wire)
  }
  return text
}

function decodeTimeRange(r: ProtoReader) {
  let start: number | undefined, end: number | undefined
  while (!r.done) {
    const { field, wire } = r.readTag()
    if (field === 1 && wire === WIRE_VARINT) start = r.readVarint()
    else if (field === 2 && wire === WIRE_VARINT) end = r.readVarint()
    else r.skip(wire)
  }
  return { start, end }
}

function decodeTripDescriptor(r: ProtoReader): TripDescriptor {
  const t: TripDescriptor = {}
  while (!r.done) {
    const { field, wire } = r.readTag()
    if      (field === 1 && wire === WIRE_LEN)    t.trip_id = r.readString()
    else if (field === 3 && wire === WIRE_LEN)    t.route_id = r.readString()
    else if (field === 4 && wire === WIRE_VARINT) t.direction_id = r.readVarint()
    else if (field === 5 && wire === WIRE_LEN)    t.start_time = r.readString()
    else if (field === 6 && wire === WIRE_LEN)    t.start_date = r.readString()
    else if (field === 7 && wire === WIRE_VARINT) t.schedule_relationship = r.readVarint()
    else r.skip(wire)
  }
  return t
}

function decodeVehicleDescriptor(r: ProtoReader) {
  let id: string | undefined, label: string | undefined
  while (!r.done) {
    const { field, wire } = r.readTag()
    if      (field === 1 && wire === WIRE_LEN) id = r.readString()
    else if (field === 2 && wire === WIRE_LEN) label = r.readString()
    else r.skip(wire)
  }
  return { id, label }
}

function decodeStopTimeEvent(r: ProtoReader) {
  let delay: number | undefined, time: number | undefined
  while (!r.done) {
    const { field, wire } = r.readTag()
    if      (field === 1 && wire === WIRE_VARINT) delay = r.readVarint()
    else if (field === 2 && wire === WIRE_VARINT) time = r.readVarint()
    else r.skip(wire)
  }
  return { delay, time }
}

function decodeStopTimeUpdate(r: ProtoReader): StopTimeUpdate {
  const s: StopTimeUpdate = { stop_id: '' }
  while (!r.done) {
    const { field, wire } = r.readTag()
    if      (field === 1 && wire === WIRE_VARINT) s.stop_sequence = r.readVarint()
    else if (field === 4 && wire === WIRE_LEN)    s.stop_id = r.readString()
    else if (field === 2 && wire === WIRE_LEN)    s.arrival = decodeStopTimeEvent(r.subReader())
    else if (field === 3 && wire === WIRE_LEN)    s.departure = decodeStopTimeEvent(r.subReader())
    else if (field === 5 && wire === WIRE_VARINT) s.schedule_relationship = r.readVarint()
    else r.skip(wire)
  }
  return s
}

function decodeTripUpdate(r: ProtoReader): TripUpdate {
  const u: TripUpdate = { trip: {}, stop_time_update: [] }
  while (!r.done) {
    const { field, wire } = r.readTag()
    if      (field === 1 && wire === WIRE_LEN)    u.trip = decodeTripDescriptor(r.subReader())
    else if (field === 3 && wire === WIRE_LEN)    u.vehicle = decodeVehicleDescriptor(r.subReader())
    else if (field === 2 && wire === WIRE_LEN)    u.stop_time_update.push(decodeStopTimeUpdate(r.subReader()))
    else if (field === 4 && wire === WIRE_VARINT) u.timestamp = r.readVarint()
    else r.skip(wire)
  }
  return u
}

function decodePosition(r: ProtoReader) {
  let latitude = 0, longitude = 0, bearing: number | undefined, speed: number | undefined
  while (!r.done) {
    const { field, wire } = r.readTag()
    if      (field === 1 && wire === WIRE_32BIT)  latitude = r.readFloat()
    else if (field === 2 && wire === WIRE_32BIT)  longitude = r.readFloat()
    else if (field === 3 && wire === WIRE_32BIT)  bearing = r.readFloat()
    else if (field === 4 && wire === WIRE_64BIT)  { r['pos'] += 8 } // double distance
    else if (field === 5 && wire === WIRE_32BIT)  speed = r.readFloat()
    else r.skip(wire)
  }
  return { latitude, longitude, bearing, speed }
}

function decodeVehiclePosition(r: ProtoReader): VehiclePosition {
  const v: VehiclePosition = {}
  while (!r.done) {
    const { field, wire } = r.readTag()
    if      (field === 1 && wire === WIRE_LEN)    v.trip = decodeTripDescriptor(r.subReader())
    else if (field === 8 && wire === WIRE_LEN)    v.vehicle = decodeVehicleDescriptor(r.subReader())
    else if (field === 2 && wire === WIRE_LEN)    v.position = decodePosition(r.subReader())
    else if (field === 3 && wire === WIRE_VARINT) v.current_stop_sequence = r.readVarint()
    else if (field === 7 && wire === WIRE_LEN)    v.stop_id = r.readString()
    else if (field === 4 && wire === WIRE_VARINT) v.current_status = r.readVarint()
    else if (field === 5 && wire === WIRE_VARINT) v.timestamp = r.readVarint()
    else r.skip(wire)
  }
  return v
}

function decodeInformedEntity(r: ProtoReader) {
  const e: { route_id?: string; stop_id?: string; trip?: TripDescriptor } = {}
  while (!r.done) {
    const { field, wire } = r.readTag()
    if      (field === 1 && wire === WIRE_LEN) e.route_id = r.readString()
    else if (field === 4 && wire === WIRE_LEN) e.stop_id = r.readString()
    else if (field === 5 && wire === WIRE_LEN) e.trip = decodeTripDescriptor(r.subReader())
    else r.skip(wire)
  }
  return e
}

function decodeAlert(r: ProtoReader): ServiceAlert {
  const a: ServiceAlert = {
    active_period: [],
    informed_entity: [],
  }
  while (!r.done) {
    const { field, wire } = r.readTag()
    if      (field === 1 && wire === WIRE_LEN)    a.active_period!.push(decodeTimeRange(r.subReader()))
    else if (field === 5 && wire === WIRE_LEN)    a.informed_entity!.push(decodeInformedEntity(r.subReader()))
    else if (field === 6 && wire === WIRE_VARINT) a.cause = r.readVarint()
    else if (field === 7 && wire === WIRE_VARINT) a.effect = r.readVarint()
    else if (field === 8 && wire === WIRE_LEN)    a.header_text = decodeTranslatedString(r.subReader())
    else if (field === 11 && wire === WIRE_LEN)   a.description_text = decodeTranslatedString(r.subReader())
    else r.skip(wire)
  }
  return a
}

function decodeEntity(r: ProtoReader): GtfsRtEntity {
  const e: GtfsRtEntity = { id: '' }
  while (!r.done) {
    const { field, wire } = r.readTag()
    if      (field === 1 && wire === WIRE_LEN)    e.id = r.readString()
    else if (field === 2 && wire === WIRE_VARINT) e.is_deleted = r.readVarint() !== 0
    else if (field === 3 && wire === WIRE_LEN)    e.trip_update = decodeTripUpdate(r.subReader())
    else if (field === 4 && wire === WIRE_LEN)    e.vehicle = decodeVehiclePosition(r.subReader())
    else if (field === 5 && wire === WIRE_LEN)    e.alert = decodeAlert(r.subReader())
    else r.skip(wire)
  }
  return e
}

// ── Public API ─────────────────────────────────────────────────────────────

export function decodeGtfsRtFeed(buffer: Uint8Array): GtfsRtFeed {
  const r = new ProtoReader(buffer)
  const feed: GtfsRtFeed = {
    header: { gtfs_realtime_version: '2.0', timestamp: 0 },
    entity: [],
  }

  while (!r.done) {
    const { field, wire } = r.readTag()
    if (field === 1 && wire === WIRE_LEN) {
      // FeedHeader
      const h = r.subReader()
      while (!h.done) {
        const t = h.readTag()
        if      (t.field === 1 && t.wire === WIRE_LEN)    feed.header.gtfs_realtime_version = h.readString()
        else if (t.field === 3 && t.wire === WIRE_VARINT) feed.header.timestamp = h.readVarint()
        else h.skip(t.wire)
      }
    } else if (field === 2 && wire === WIRE_LEN) {
      feed.entity.push(decodeEntity(r.subReader()))
    } else {
      r.skip(wire)
    }
  }

  return feed
}
