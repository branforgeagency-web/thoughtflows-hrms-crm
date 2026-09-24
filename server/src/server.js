import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { connectDB } from './config/db.js';
import apiRoutes from './routes/api.js';

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
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('dev'));

// Static serving for call recordings
app.use('/recordings', express.static(recordingsDir));

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
    const provider = (process.env.TELEPHONY_PROVIDER || (process.env.MYOPERATOR_TOKEN ? 'myoperator' : 'exotel')).toLowerCase();
    const myoperatorReady = !!process.env.MYOPERATOR_TOKEN;
    const exotelReady = !!(process.env.EXOTEL_SID && process.env.EXOTEL_API_KEY && process.env.EXOTEL_API_TOKEN && process.env.EXOTEL_EXOPHONE);
    console.log(`📞 Telephony Provider: ${provider.toUpperCase()} (${provider === 'myoperator' ? (myoperatorReady ? 'configured ✓' : 'token pending in server/.env') : (exotelReady ? 'configured ✓' : 'NOT configured')})`);
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
