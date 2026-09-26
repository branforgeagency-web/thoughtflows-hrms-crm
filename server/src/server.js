import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { connectDB } from './config/db.js';
import apiRoutes from './routes/api.js';
import { requireStaffToken } from './middleware/auth.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure recordings upload directory exists
const recordingsDir = path.join(__dirname, '../uploads/recordings');
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 5001;

// Connect to MongoDB
connectDB();

// Middleware
// Only our own frontends may call the API from a browser (comma-separated CLIENT_URL)
const allowedOrigins = [
  ...String(process.env.CLIENT_URL || '').split(',').map((o) => o.trim()).filter(Boolean),
  'http://localhost:5173'
];
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin))
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('dev'));

// Static serving for call recordings
app.use('/recordings', requireStaffToken, express.static(recordingsDir));

// Routes
app.use('/api', apiRoutes);

// Root greeting
app.get('/', (req, res) => {
  res.json({
    name: 'Thoughtflows HRMS & CRM API Server',
    status: 'running',
    docs: '/api/health'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`🚀 [Thoughtflows Server] running at http://localhost:${port}`);
    const exotelReady = !!(process.env.EXOTEL_SID && process.env.EXOTEL_API_KEY && process.env.EXOTEL_API_TOKEN && process.env.EXOTEL_EXOPHONE);
    console.log(`📞 Telephony: EXOTEL (${exotelReady ? 'configured ✓' : 'NOT configured'}${process.env.PUBLIC_API_URL ? ' · status webhook on' : ''})`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Port ${port} in use, automatically trying port ${Number(port) + 1}...]`);
      startServer(Number(port) + 1);
    } else {
      console.error('[Server Error]:', err);
    }
  });
};

startServer(PORT);
