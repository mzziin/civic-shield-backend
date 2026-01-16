const express = require('express');
const router = express.Router();
const {
  reportIncidentHandler,
  getDangerZonesHandler
} = require('../controllers/incidentController');
const { requireAuth } = require('../middleware/auth');

// Store io instance for use in controller
let ioInstance = null;

const setIO = (io) => {
  ioInstance = io;
};

const reportIncident = (req, res) => {
  return reportIncidentHandler(req, res, ioInstance);
};

router.post('/report', requireAuth, reportIncident);
router.get('/danger-zones', getDangerZonesHandler);

module.exports = { router, setIO };
