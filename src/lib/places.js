import { Loader } from '@googlemaps/js-api-loader'

const key = import.meta.env.VITE_GOOGLE_MAPS_KEY

export const isPlacesConfigured = Boolean(key)

let placesPromise = null

// Lazily load the Google Maps "places" library exactly once.
// Resolves with the places library namespace; rejects if no API key.
export function loadPlaces() {
  if (!key) {
    return Promise.reject(new Error('VITE_GOOGLE_MAPS_KEY is not configured'))
  }
  if (!placesPromise) {
    const loader = new Loader({
      apiKey: key,
      version: 'weekly',
      libraries: ['places'],
    })
    placesPromise = loader.importLibrary('places')
  }
  return placesPromise
}
