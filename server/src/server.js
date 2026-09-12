import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import apiRoutes from './routes/api.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

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
