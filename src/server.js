require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const cron = require('node-cron');
const connectDB = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const locationRoutes = require('./routes/locationRoutes');
const { router: incidentRoutes, setIO } = require('./routes/incidentRoutes');
const evacuationRoutes = require('./routes/evacuation');
const Incident = require('./models/Incident');
const DangerZone = require('./models/DangerZone');
const User = require('./models/User');
const { sendDangerZoneAlert } = require('./utils/sms');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "https://civic-shield-frontend-fzlj.vercel.app",
    credentials: true
  }
});

// Set IO instance for incident routes
setIO(io);

// Connect to database
connectDB();

// Trust proxy (needed for secure cookies behind reverse proxy)
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "https://civic-shield-frontend-fzlj.vercel.app",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax' // 'none' for cross-origin in production, 'lax' for development
  },
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI
  })
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/evacuation', evacuationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Background job: Clean up expired incidents and update danger zones
cron.schedule('0 * * * *', async () => {
  console.log('Running cleanup job...');

  try {
    // Delete expired incidents
    const now = new Date();
    const result = await Incident.deleteMany({ expiresAt: { $lt: now } });
    console.log(`Deleted ${result.deletedCount} expired incidents`);

    // Recalculate danger zones
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get all active danger zones
    const activeDangerZones = await DangerZone.find({ isActive: true });

    for (const zone of activeDangerZones) {
      // Count incidents in last 24 hours for this city
      const incidentCount = await Incident.countDocuments({
        city: zone.city,
        reportedAt: { $gte: twentyFourHoursAgo }
      });

      if (incidentCount < 50) {
        // Deactivate danger zone
        zone.isActive = false;
        await zone.save();

        // Emit WebSocket event
        io.emit('dangerZoneRemoved', { city: zone.city });
        console.log(`Deactivated danger zone for ${zone.city}`);
      } else {
        // Update count
        zone.incidentCount = incidentCount;
        zone.lastUpdated = now;
        await zone.save();

        // Emit WebSocket event
        io.emit('dangerZoneUpdate', {
          city: zone.city,
          incidentCount: zone.incidentCount,
          coordinates: zone.coordinates,
          isActive: zone.isActive
        });
      }
    }
  } catch (error) {
    console.error('Cleanup job error:', error);
  }
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
