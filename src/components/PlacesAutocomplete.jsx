import { useEffect, useRef } from 'react'
import { loadPlaces, isPlacesConfigured } from '../lib/places'
import Input from './ui/Input'

// Turn a Google place into a tidy "City, ST" string.
function formatPlace(place) {
  if (!place) return ''
  const comps = place.address_components || []
  const get = (type) => comps.find((c) => c.types.includes(type))
  const city =
    get('locality')?.long_name ||
    get('postal_town')?.long_name ||
    get('administrative_area_level_2')?.long_name ||
    place.name
  const state = get('administrative_area_level_1')?.short_name
  if (city && state) return `${city}, ${state}`
  return place.formatted_address || place.name || ''
}

/**
 * Location input backed by Google Places autocomplete.
 * - US only, cities only.
 * - If VITE_GOOGLE_MAPS_KEY is missing it degrades to a plain text input,
 *   so the form still works during local development.
 */
export default function PlacesAutocomplete({
  value,
  onChange,
  id,
  error,
  placeholder = 'City, State',
  ...props
}) {
  const inputRef = useRef(null)
  const acRef = useRef(null)

  useEffect(() => {
    if (!isPlacesConfigured) return
    let cancelled = false

    loadPlaces()
      .then((places) => {
        if (cancelled || !inputRef.current) return
        const ac = new places.Autocomplete(inputRef.current, {
          types: ['(cities)'],
          componentRestrictions: { country: 'us' },
          fields: ['formatted_address', 'name', 'address_components'],
        })
        acRef.current = ac
        ac.addListener('place_changed', () => {
          const place = ac.getPlace()
          const text = formatPlace(place) || inputRef.current.value
          onChange?.(text)
        })
      })
      .catch((e) => console.warn('Google Places failed to load:', e.message))

    return () => {
      cancelled = true
      if (acRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(acRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Input
      ref={inputRef}
      id={id}
      value={value || ''}
      error={error}
      placeholder={placeholder}
      autoComplete="off"
      onChange={(e) => onChange?.(e.target.value)}
      {...props}
    />
  )
}
