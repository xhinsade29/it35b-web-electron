/**
 * River Utilities
 * Helper functions for Mangima River calculations
 */

// Default river coordinates
export const DEFAULT_RIVER_COORDS: [number, number][] = [
  [8.345958, 124.898607], [8.346955, 124.899036], [8.347603, 124.898081],
  [8.349471, 124.896461], [8.349216, 124.895474], [8.349535, 124.894755],
  [8.348909, 124.894058], [8.349881, 124.893209], [8.352050, 124.889584],
  [8.351096, 124.889497], [8.351978, 124.888415], [8.352369, 124.887056],
  [8.352210, 124.886676], [8.352643, 124.886427], [8.353468, 124.884863],
  [8.355492, 124.883376], [8.356292, 124.881332], [8.358270, 124.881140],
  [8.368532, 124.875713], [8.373977, 124.876690], [8.381657, 124.897203],
  [8.394810, 124.903483], [8.396343, 124.907500], [8.399906, 124.911121],
  [8.400757, 124.910773], [8.401407, 124.910581], [8.401636, 124.910868],
  [8.401774, 124.911007], [8.402125, 124.911168], [8.402489, 124.911218],
  [8.402853, 124.911196], [8.403020, 124.911119], [8.403792, 124.910506],
  [8.405310, 124.909972], [8.405901, 124.909983], [8.406337, 124.910087],
  [8.406533, 124.910179], [8.406700, 124.910291], [8.406745, 124.910385],
  [8.406713, 124.910512], [8.405924, 124.911388], [8.405818, 124.911576],
  [8.405829, 124.911689], [8.405924, 124.911801], [8.406275, 124.911984],
  [8.406715, 124.912414], [8.407049, 124.912661], [8.409034, 124.913466],
  [8.409793, 124.913708], [8.410064, 124.913713], [8.410472, 124.913676],
  [8.411629, 124.913198], [8.412245, 124.912800], [8.412515, 124.912462],
  [8.412632, 124.911962], [8.413237, 124.909739], [8.413179, 124.909497],
];

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if a point is within a certain distance from the river
 */
export function checkDistanceToRiver(
  lat: number,
  lng: number,
  riverCoords: [number, number][] = DEFAULT_RIVER_COORDS,
  maxDistanceKm: number = 0.5
): boolean {
  let minDistance = Infinity;

  for (const [riverLat, riverLng] of riverCoords) {
    const distance = calculateDistance(lat, lng, riverLat, riverLng);
    if (distance < minDistance) {
      minDistance = distance;
    }
  }

  return minDistance <= maxDistanceKm;
}

/**
 * Detect river section based on longitude
 */
export function detectRiverSection(lng: number): 'upstream' | 'midstream' | 'downstream' {
  const midstreamStart = 124.876785;
  const midstreamEnd = 124.903068;

  if (lng < midstreamStart) return 'upstream';
  if (lng >= midstreamStart && lng <= midstreamEnd) return 'midstream';
  return 'downstream';
}

/**
 * Get section display name
 */
export function getSectionDisplayName(section: string): string {
  if (!section) return 'Unknown';
  return section.charAt(0).toUpperCase() + section.slice(1);
}
