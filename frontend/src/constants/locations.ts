/** Preset cities/regions — location must be one of these or cleared (empty). */
export const PRESET_LOCATIONS: string[] = [
  'New York, USA',
  'Los Angeles, USA',
  'Chicago, USA',
  'London, UK',
  'Paris, France',
  'Berlin, Germany',
  'Amsterdam, Netherlands',
  'Dubai, UAE',
  'Singapore',
  'Tokyo, Japan',
  'Seoul, South Korea',
  'Sydney, Australia',
  'Toronto, Canada',
  'Mumbai, India',
  'Delhi, India',
  'Bangalore, India',
  'Hyderabad, India',
  'Chennai, India',
  'Kolkata, India',
  'São Paulo, Brazil',
  'Mexico City, Mexico',
  'Nairobi, Kenya',
  'Cape Town, South Africa',
]

export function isAllowedPresetLocation(value: string): boolean {
  const t = value.trim()
  if (!t) return true
  return PRESET_LOCATIONS.includes(t)
}
