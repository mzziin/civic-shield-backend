const DangerZone = require('../models/DangerZone');
const { findSafeDestinations, calculateEscapePoints } = require('../services/safeDestinationService');
const { calculateEvacuationRoutes, simplifyInstructions } = require('../services/routingService');
const { isNearDangerZone } = require('../utils/geometryHelper');

/**
 * Calculate evacuation routes for user
 */
exports.calculateRoutes = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const userId = req.session.userId;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }
    
    // Get active danger zones
    const dangerZones = await DangerZone.find({ isActive: true });
    
    if (dangerZones.length === 0) {
      return res.json({
        success: true,
        message: 'No active danger zones. You are safe.',
        routes: []
      });
    }
    
    // Check if user is near any danger zone
    const isInDanger = dangerZones.some(zone => 
      isNearDangerZone(latitude, longitude, zone, 10) // 10km radius
    );
    
    if (!isInDanger) {
      return res.json({
        success: true,
        message: 'You are not near any danger zones.',
        routes: []
      });
    }
    
    // Find only 1 safe destination (police or fire station) for faster response
    const safeDestinations = await findSafeDestinations(
      latitude, longitude, dangerZones, 1
    );
    
    // Get only 1 escape point (safe area outside danger zone)
    const escapePoints = calculateEscapePoints(latitude, longitude, dangerZones, 10);
    const selectedDestinations = [];
    
    // Prioritize: 1 safe destination (police/fire station) + 1 escape point
    if (safeDestinations.length > 0) {
      selectedDestinations.push(safeDestinations[0]);
    }
    if (escapePoints.length > 0) {
      selectedDestinations.push(escapePoints[0]);
    }
    
    if (selectedDestinations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No safe destinations found nearby'
      });
    }
    
    // Calculate routes to exactly 2 destinations (1 safe destination + 1 escape point)
    const routes = await calculateEvacuationRoutes(
      latitude, longitude,
      selectedDestinations,
      dangerZones
    );
    
    // Simplify instructions for each route
    const routesWithSimplifiedInstructions = routes.map(route => ({
      ...route,
      simplifiedInstructions: simplifyInstructions(route.instructions, 5)
    }));
    
    res.json({
      success: true,
      routes: routesWithSimplifiedInstructions,
      dangerZones: dangerZones.map(zone => ({
        city: zone.city,
        coordinates: zone.coordinates
      }))
    });
    
  } catch (error) {
    console.error('Calculate routes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate evacuation routes',
      error: error.message
    });
  }
};

/**
 * Check if user should be notified about being in danger zone
 */
exports.checkDangerStatus = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    const dangerZones = await DangerZone.find({ isActive: true });
    
    const nearbyZones = dangerZones.filter(zone =>
      isNearDangerZone(latitude, longitude, zone, 10)
    );
    
    res.json({
      success: true,
      isInDanger: nearbyZones.length > 0,
      nearbyZones: nearbyZones.map(zone => ({
        city: zone.city,
        incidentCount: zone.incidentCount,
        coordinates: zone.coordinates
      }))
    });
    
  } catch (error) {
    console.error('Check danger status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check danger status'
    });
  }
};
