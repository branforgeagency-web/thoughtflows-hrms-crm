/**
 * Geolocation utility to fetch current coordinates and reverse-geocode to a readable location
 */

// Cache last known location for up to 60 seconds
let cachedLocation = null;
let cachedTime = 0;

export async function fetchCurrentLocation(options = {}) {
  const { maxAgeMs = 60000, timeoutMs = 8000 } = options;

  if (cachedLocation && Date.now() - cachedTime < maxAgeMs) {
    return cachedLocation;
  }

  if (typeof window === 'undefined' || !navigator.geolocation) {
    return {
      success: false,
      error: 'Geolocation is not supported by your browser',
      address: ''
    };
  }

  return new Promise((resolve) => {
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({
          success: false,
          error: 'Location request timed out',
          address: ''
        });
      }
    }, timeoutMs);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy || 0);
        const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

        // Attempt reverse geocoding via Nominatim
        let address = '';
        try {
          const controller = new AbortController();
          const geoTimer = setTimeout(() => controller.abort(), 3500);
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`,
            { signal: controller.signal, headers: { Accept: 'application/json' } }
          );
          clearTimeout(geoTimer);
          if (res.ok) {
            const data = await res.json();
            const a = data.address || {};
            const locality = a.suburb || a.neighbourhood || a.residential || a.city_district || a.village || a.subdistrict || '';
            const city = a.city || a.town || a.county || a.state_district || '';
            const state = a.state || '';
            const parts = [locality, city, state].filter(Boolean);
            address = parts.length > 0 ? parts.join(', ') : (data.display_name?.slice(0, 80) || '');
          }
        } catch (_) {
          // reverse geocode failed or timed out
        }

        if (!address) {
          address = `Lat: ${lat.toFixed(4)}, Long: ${lng.toFixed(4)}`;
        }

        const result = {
          success: true,
          latitude: lat,
          longitude: lng,
          accuracy,
          address,
          mapsUrl,
          capturedAt: new Date().toISOString()
        };

        cachedLocation = result;
        cachedTime = Date.now();
        resolve(result);
      },
      (err) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);

        let errMsg = 'Location permission not granted';
        if (err.code === 1) errMsg = 'Location permission denied by user';
        else if (err.code === 2) errMsg = 'Location position unavailable';
        else if (err.code === 3) errMsg = 'Location request timed out';

        resolve({
          success: false,
          error: errMsg,
          code: err.code,
          address: ''
        });
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: maxAgeMs
      }
    );
  });
}
