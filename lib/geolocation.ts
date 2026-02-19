export async function getLocationPermissionState(): Promise<PermissionState | 'unsupported'> {
  if (typeof navigator === 'undefined' || !('permissions' in navigator)) return 'unsupported'

  try {
    const status = await navigator.permissions.query({ name: 'geolocation' })
    return status.state
  } catch {
    return 'unsupported'
  }
}

export function isMobileBrowser() {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod|android|mobile/i.test(navigator.userAgent)
}

export function getGeoUnsupportedReason() {
  if (typeof window === 'undefined') return null
  if (!navigator.geolocation) return 'Geolocation is not supported on this device.'
  if (!window.isSecureContext) return 'Location access requires HTTPS (or localhost). Please open the app securely.'
  return null
}

export async function getGeoDeniedMessage(errorMessage: string) {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent.toLowerCase()
  const isiPhone = /iphone|ipad|ipod/.test(ua)
  const isAndroid = /android/.test(ua)
  const permissionState = await getLocationPermissionState()

  const permissionHint = permissionState === 'denied'
    ? 'Location access is currently blocked for this site. Re-enable it in browser website settings and reload the page.'
    : 'When prompted by the browser, choose Allow for location permission.'

  if (isiPhone) {
    return [
      'Unable to get GPS location on iPhone.',
      permissionHint,
      'Try these steps:',
      '1) iPhone Settings → Privacy & Security → Location Services → ON.',
      '2) Open this site in Safari, then tap aA → Website Settings → Location → Allow.',
      '3) If opened inside an in-app browser (Instagram/Facebook/etc), open the same link in Safari and try again.',
      '4) Tap Use GPS after page load (permission on iOS is more reliable from a direct user tap).',
      '5) Reload the page after changing permissions.',
      `Original error: ${errorMessage}`,
    ].join('\n')
  }

  if (isAndroid) {
    return [
      'Unable to get GPS location on Android.',
      permissionHint,
      'Try these steps:',
      '1) Device Location must be ON.',
      '2) Browser App Info → Permissions → Location → Allow while using app.',
      '3) In browser site settings for this site → Location → Allow.',
      '4) Tap Use GPS again after allowing permissions.',
      '5) Reload the page if needed.',
      `Original error: ${errorMessage}`,
    ].join('\n')
  }

  return `Unable to get GPS location. ${permissionHint}\nOriginal error: ${errorMessage}`
}

export function requestCurrentPosition(options?: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    const unsupported = getGeoUnsupportedReason()
    if (unsupported) {
      reject(new Error(unsupported))
      return
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0,
      ...options,
    })
  })
}

export type ApproximatePosition = {
  lat: number
  lng: number
  source: 'ipapi' | 'ipwhois'
}

export async function requestApproximatePositionByIP(): Promise<ApproximatePosition> {
  const controllers = [new AbortController(), new AbortController()]
  const timer = setTimeout(() => {
    controllers.forEach((controller) => controller.abort())
  }, 6000)

  try {
    const first = await fetch('https://ipapi.co/json/', { signal: controllers[0].signal })
    if (first.ok) {
      const data = await first.json() as { latitude?: number; longitude?: number }
      if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        return { lat: data.latitude, lng: data.longitude, source: 'ipapi' }
      }
    }
  } catch {
    // Continue to backup provider
  }

  try {
    const second = await fetch('https://ipwho.is/', { signal: controllers[1].signal })
    if (second.ok) {
      const data = await second.json() as { latitude?: number; longitude?: number }
      if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        return { lat: data.latitude, lng: data.longitude, source: 'ipwhois' }
      }
    }
  } catch {
    // Ignore and throw fallback error below
  } finally {
    clearTimeout(timer)
  }

  throw new Error('Unable to determine even approximate location from network.')
}

export async function requestCurrentPositionWithFallback(): Promise<GeolocationPosition> {
  try {
    return await requestCurrentPosition({ enableHighAccuracy: true, timeout: 20000, maximumAge: 0 })
  } catch {
    try {
      return await requestCurrentPosition({ enableHighAccuracy: false, timeout: 25000, maximumAge: 60000 })
    } catch {
      return new Promise((resolve, reject) => {
        const unsupported = getGeoUnsupportedReason()
        if (unsupported) {
          reject(new Error(unsupported))
          return
        }

        let settled = false
        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            if (settled) return
            settled = true
            navigator.geolocation.clearWatch(watchId)
            resolve(position)
          },
          (error) => {
            if (settled) return
            settled = true
            navigator.geolocation.clearWatch(watchId)
            reject(error)
          },
          { enableHighAccuracy: false, timeout: 30000, maximumAge: 120000 },
        )

        setTimeout(() => {
          if (settled) return
          settled = true
          navigator.geolocation.clearWatch(watchId)
          reject(new Error('Timed out while waiting for location fix.'))
        }, 32000)
      })
    }
  }
}
