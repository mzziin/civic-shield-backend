const axios = require('axios');
const { calculateDistance, isNearDangerZone } = require('../utils/geometryHelper');

/**
 * Find nearest safe destination (police or fire station) - optimized for speed
 */
async function findSafeDestinations(userLat, userLon, dangerZones, limit = 1) {
  // Prioritize police and fire stations (most important for emergencies)
  const priorityLocationTypes = [
    { type: 'police', query: 'police station' },
    { type: 'fire_station', query: 'fire station' }
  ];
  
  // Search for priority locations first (stop once we find one)
  for (const locationType of priorityLocationTypes) {
    try {
      const response = await axios.get(
        'https://nominatim.openstreetmap.org/search',
        {
          params: {
            format: 'json',
            q: locationType.query,
            lat: userLat,
            lon: userLon,
            limit: 5, // Reduced from 10 for faster response
            addressdetails: 1
          },
          headers: {
            'User-Agent': 'IncidentReportApp/1.0'
          }
        }
      );
      
      // Process results
      const destinations = response.data.map(place => ({
        name: place.display_name.split(',')[0],
        type: locationType.type,
        latitude: parseFloat(place.lat),
        longitude: parseFloat(place.lon),
        address: place.display_name,
        distance: calculateDistance(
          userLat, userLon,
          parseFloat(place.lat),
          parseFloat(place.lon)
        )
      }));
      
      // Filter out destinations in danger zones and sort by distance
      const safeDestinations = destinations
        .filter(dest => {
          return !dangerZones.some(zone => 
            isNearDangerZone(dest.latitude, dest.longitude, zone, 3)
          );
        })
        .sort((a, b) => a.distance - b.distance);
      
      // Return first safe destination found
      if (safeDestinations.length > 0) {
        return safeDestinations.slice(0, limit);
      }
      
    } catch (error) {
      console.error(`Error fetching ${locationType.type}:`, error.message);
    }
  }
  
  // If no police/fire station found, return empty array
  return [];
}

/**
 * Calculate multiple escape points in different directions outside danger zones
 */
function calculateEscapePoints(userLat, userLon, dangerZones, distanceKm = 10) {
  if (dangerZones.length === 0) {
    return [];
  }
  
  const escapePoints = [];
  const directions = [
    { name: 'North', latOffset: 1, lonOffset: 0 },
    { name: 'South', latOffset: -1, lonOffset: 0 },
    { name: 'East', latOffset: 0, lonOffset: 1 },
    { name: 'West', latOffset: 0, lonOffset: -1 },
    { name: 'Northeast', latOffset: 0.707, lonOffset: 0.707 },
    { name: 'Northwest', latOffset: 0.707, lonOffset: -0.707 },
    { name: 'Southeast', latOffset: -0.707, lonOffset: 0.707 },
    { name: 'Southwest', latOffset: -0.707, lonOffset: -0.707 }
  ];
  
  // Calculate distance per degree (approximate)
  const latKmPerDegree = 111; // ~111km per degree latitude
  const lonKmPerDegree = 111 * Math.cos(userLat * Math.PI / 180); // Varies by latitude
  
  for (const direction of directions) {
    // Calculate point in this direction
    const escapeLat = userLat + (direction.latOffset * distanceKm / latKmPerDegree);
    const escapeLon = userLon + (direction.lonOffset * distanceKm / lonKmPerDegree);
    
    // Check if this point is outside all danger zones
    const isSafe = !dangerZones.some(zone => 
      isNearDangerZone(escapeLat, escapeLon, zone, 8) // 8km buffer from danger zones
    );
    
    if (isSafe) {
      const distance = calculateDistance(userLat, userLon, escapeLat, escapeLon);
      escapePoints.push({
        latitude: escapeLat,
        longitude: escapeLon,
        type: 'escape_point',
        name: `Safe Area (${direction.name})`,
        address: `Safe area ${distanceKm}km ${direction.name}`,
        distance: distance
      });
    }
  }
  
  // If no safe points found in cardinal directions, try further distances
  if (escapePoints.length === 0) {
    for (let dist = 15; dist <= 30; dist += 5) {
      for (const direction of directions.slice(0, 4)) { // Try only cardinal directions first
        const escapeLat = userLat + (direction.latOffset * dist / latKmPerDegree);
        const escapeLon = userLon + (direction.lonOffset * dist / lonKmPerDegree);
        
        const isSafe = !dangerZones.some(zone => 
          isNearDangerZone(escapeLat, escapeLon, zone, 8)
        );
        
        if (isSafe) {
          const distance = calculateDistance(userLat, userLon, escapeLat, escapeLon);
          escapePoints.push({
            latitude: escapeLat,
            longitude: escapeLon,
            type: 'escape_point',
            name: `Safe Area (${direction.name})`,
            address: `Safe area ${dist}km ${direction.name}`,
            distance: distance
          });
          break; // Found one, move to next distance
        }
      }
      if (escapePoints.length > 0) break; // Found at least one, stop searching
    }
  }
  
  // Sort by distance and return top 3
  escapePoints.sort((a, b) => a.distance - b.distance);
  return escapePoints.slice(0, 3);
}

/**
 * Calculate point outside all danger zones in the escape direction (legacy function for backward compatibility)
 */
function calculateEscapePoint(userLat, userLon, dangerZones, distanceKm = 10) {
  const escapePoints = calculateEscapePoints(userLat, userLon, dangerZones, distanceKm);
  return escapePoints.length > 0 ? escapePoints[0] : null;
}

module.exports = {
  findSafeDestinations,
  calculateEscapePoint,
  calculateEscapePoints
};
