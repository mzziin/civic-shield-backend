const Incident = require('../models/Incident');
const User = require('../models/User');
const DangerZone = require('../models/DangerZone');
const { reverseGeocode } = require('../utils/geocoding');
const { sendDangerZoneAlert } = require('../utils/sms');

const reportIncidentHandler = async (req, res, io) => {
  try {
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates'
      });
    }

    const userId = req.session.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Reverse geocode to get city
    const city = await reverseGeocode(latitude, longitude);

    // Check if user has reported in the same city within last 24 hours
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    if (user.lastReportCity === city && user.lastReportTime && user.lastReportTime > twentyFourHoursAgo) {
      const canReportAgainAt = new Date(user.lastReportTime.getTime() + 24 * 60 * 60 * 1000);
      return res.status(400).json({
        success: false,
        message: 'You can only report once per city every 24 hours',
        canReportAgainAt: canReportAgainAt.toISOString()
      });
    }

    // Create incident
    const expiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days
    const incident = await Incident.create({
      userId,
      latitude,
      longitude,
      city,
      reportedAt: now,
      expiresAt
    });

    // Update user's last report info and location
    await User.findByIdAndUpdate(userId, {
      lastReportTime: now,
      lastReportCity: city,
      lastKnownCity: city,
      lastKnownLatitude: latitude,
      lastKnownLongitude: longitude
    });

    // Check incident count for the city in last 24 hours
    const incidentCount = await Incident.countDocuments({
      city,
      reportedAt: { $gte: twentyFourHoursAgo }
    });

    // If count >= 50, create/update danger zone
    if (incidentCount >= 1) {
      let dangerZone = await DangerZone.findOne({ city });

      if (!dangerZone) {
        // Create new danger zone
        dangerZone = await DangerZone.create({
          city,
          incidentCount,
          coordinates: {
            latitude,
            longitude
          },
          isActive: true,
          lastUpdated: now
        });

        // Emit WebSocket event
        io.emit('dangerZoneUpdate', {
          city: dangerZone.city,
          incidentCount: dangerZone.incidentCount,
          coordinates: dangerZone.coordinates,
          isActive: dangerZone.isActive
        });

        // Send SMS to all users in that city
        const usersInCity = await User.find({ lastKnownCity: city });
        for (const user of usersInCity) {
          await sendDangerZoneAlert(user.mobileNumber, city);
        }
      } else {
        // Update existing danger zone
        dangerZone.incidentCount = incidentCount;
        dangerZone.lastUpdated = now;
        dangerZone.isActive = true;
        await dangerZone.save();

        // Emit WebSocket event
        io.emit('dangerZoneUpdate', {
          city: dangerZone.city,
          incidentCount: dangerZone.incidentCount,
          coordinates: dangerZone.coordinates,
          isActive: dangerZone.isActive
        });
      }
    }

    const canReportAgainAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    res.json({
      success: true,
      message: 'Incident reported successfully',
      canReportAgainAt: canReportAgainAt.toISOString()
    });
  } catch (error) {
    console.error('Report incident error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to report incident'
    });
  }
};

const getDangerZonesHandler = async (req, res) => {
  try {
    const dangerZones = await DangerZone.find({ isActive: true });

    res.json({
      success: true,
      dangerZones: dangerZones.map(zone => ({
        city: zone.city,
        incidentCount: zone.incidentCount,
        coordinates: zone.coordinates,
        lastUpdated: zone.lastUpdated
      }))
    });
  } catch (error) {
    console.error('Get danger zones error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get danger zones'
    });
  }
};

module.exports = {
  reportIncidentHandler,
  getDangerZonesHandler
};
