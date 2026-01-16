const User = require('../models/User');
const { reverseGeocode } = require('../utils/geocoding');

const updateLocationHandler = async (req, res) => {
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

    // Reverse geocode to get city
    const city = await reverseGeocode(latitude, longitude);

    // Update user location
    await User.findByIdAndUpdate(req.session.userId, {
      lastKnownCity: city,
      lastKnownLatitude: latitude,
      lastKnownLongitude: longitude
    });

    res.json({
      success: true,
      city
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location'
    });
  }
};

module.exports = { updateLocationHandler };
