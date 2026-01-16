const axios = require('axios');

const reverseGeocode = async (latitude, longitude) => {
  try {
    const response = await axios.get(
      'https://nominatim.openstreetmap.org/reverse',
      {
        params: {
          format: 'json',
          lat: latitude,
          lon: longitude
        },
        headers: {
          'User-Agent': 'IncidentReportApp/1.0'
        }
      }
    );

    const address = response.data.address;
    const city = address.city || 
                 address.town || 
                 address.village || 
                 address.county ||
                 address.state_district ||
                 'Unknown';

    return city;
  } catch (error) {
    console.error('Geocoding error:', error);
    return 'Unknown';
  }
};

module.exports = { reverseGeocode };
