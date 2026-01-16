const axios = require('axios');
const { calculateRouteDangerScore } = require('../utils/geometryHelper');

const ORS_API_KEY = process.env.OPENROUTESERVICE_API_KEY;
const ORS_BASE_URL = 'https://api.openrouteservice.org/v2/directions';

/**
 * Get single route from OpenRouteService (optimized for speed)
 */
async function getRoute(startLat, startLon, endLat, endLon) {
  try {
    const response = await axios.post(
      `${ORS_BASE_URL}/driving-car/geojson`,
      {
        coordinates: [
          [startLon, startLat],
          [endLon, endLat]
        ],
        // No alternative routes - faster response
        instructions: true,
        elevation: false
      },
      {
        headers: {
          'Authorization': ORS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Return single route (first feature)
    return response.data.features[0];
  } catch (error) {
    console.error('OpenRouteService error:', error.response?.data || error.message);
    throw new Error('Failed to calculate routes');
  }
}

/**
 * Score a single route based on safety and efficiency
 */
function scoreRoute(route, dangerZones) {
  const properties = route.properties;
  const geometry = route.geometry;
  
  // Calculate danger score
  const dangerScore = calculateRouteDangerScore(
    geometry.coordinates,
    dangerZones
  );
  
  // Determine safety level
  let safetyLevel;
  if (dangerScore === 0) {
    safetyLevel = 'safe';
  } else if (dangerScore < 50) {
    safetyLevel = 'moderate';
  } else {
    safetyLevel = 'risky';
  }
  
  // Calculate composite score (lower is better)
  // Heavily penalize danger, moderately consider time
  const compositeScore = dangerScore * 10 + (properties.summary.duration / 60);
  
  return {
    routeId: route.id || Math.random().toString(36).substr(2, 9),
    geometry: geometry,
    distance: properties.summary.distance, // meters
    duration: properties.summary.duration, // seconds
    instructions: properties.segments[0].steps,
    dangerScore: dangerScore,
    safetyLevel: safetyLevel,
    compositeScore: compositeScore
  };
}

/**
 * Main function to calculate evacuation routes (optimized for 2 routes)
 */
async function calculateEvacuationRoutes(userLat, userLon, destinations, dangerZones) {
  const routes = [];
  
  // Calculate one route per destination (max 2 destinations)
  for (const dest of destinations) {
    try {
      const route = await getRoute(
        userLat, userLon,
        dest.latitude, dest.longitude
      );
      
      const scoredRoute = scoreRoute(route, dangerZones);
      
      // Add destination info to route
      scoredRoute.destination = {
        name: dest.name,
        type: dest.type,
        address: dest.address || 'Safe Area',
        latitude: dest.latitude,
        longitude: dest.longitude
      };
      
      routes.push(scoredRoute);
      
    } catch (error) {
      console.error(`Failed to calculate route to ${dest.name}:`, error.message);
    }
  }
  
  // Sort by composite score (safety + efficiency)
  routes.sort((a, b) => a.compositeScore - b.compositeScore);
  
  // Return exactly 2 routes (or fewer if not available)
  return routes.slice(0, 2);
}

/**
 * Simplify turn instructions for display
 */
function simplifyInstructions(instructions, maxInstructions = 5) {
  // Filter out minor instructions (short distances, slight turns)
  const majorInstructions = instructions.filter(step => {
    const isMajor = 
      step.distance > 100 || // At least 100m
      step.type === 'turn' ||
      step.type === 'roundabout' ||
      step.name !== '';
    
    return isMajor;
  });
  
  // Take first N major instructions
  return majorInstructions.slice(0, maxInstructions).map(step => ({
    instruction: step.instruction,
    distance: step.distance,
    duration: step.duration,
    type: step.type,
    name: step.name
  }));
}

module.exports = {
  calculateEvacuationRoutes,
  simplifyInstructions
};
