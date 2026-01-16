/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Check if a point is within radius of a danger zone
 */
function isNearDangerZone(pointLat, pointLon, dangerZone, radiusKm = 5) {
  const distance = calculateDistance(
    pointLat,
    pointLon,
    dangerZone.coordinates.latitude,
    dangerZone.coordinates.longitude
  );
  return distance <= radiusKm;
}

/**
 * Calculate danger score for a route based on proximity to danger zones
 * Higher score = more dangerous
 */
function calculateRouteDangerScore(routeCoordinates, dangerZones) {
  let totalDangerScore = 0;
  
  for (const dangerZone of dangerZones) {
    for (const coord of routeCoordinates) {
      // coord is [longitude, latitude] in GeoJSON format
      const distance = calculateDistance(
        coord[1], coord[0],
        dangerZone.coordinates.latitude,
        dangerZone.coordinates.longitude
      );
      
      // Danger zones have ~5km danger radius
      if (distance < 5) {
        // Closer to danger zone = higher penalty
        // Max penalty at 0km, decreases linearly to 0 at 5km
        const penalty = 100 * (1 - distance / 5);
        totalDangerScore += penalty;
      }
    }
  }
  
  return totalDangerScore;
}

/**
 * Find the bearing/direction to exit a danger zone
 */
function calculateEscapeDirection(userLat, userLon, dangerZone) {
  const zoneLat = dangerZone.coordinates.latitude;
  const zoneLon = dangerZone.coordinates.longitude;
  
  // Calculate bearing from danger zone center to user position
  const dLon = toRad(userLon - zoneLon);
  const lat1 = toRad(zoneLat);
  const lat2 = toRad(userLat);
  
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  
  let bearing = Math.atan2(y, x);
  bearing = (bearing * 180 / Math.PI + 360) % 360;
  
  return bearing;
}

/**
 * Get cardinal direction from bearing
 */
function bearingToDirection(bearing) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

module.exports = {
  calculateDistance,
  isNearDangerZone,
  calculateRouteDangerScore,
  calculateEscapeDirection,
  bearingToDirection
};
