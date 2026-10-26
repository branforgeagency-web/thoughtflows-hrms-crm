import mongoose from 'mongoose';

let retryTimer = null;

const scheduleRetry = (delayMs = 8000) => {
  if (retryTimer) return; // a retry is already pending
  retryTimer = setTimeout(() => {
    retryTimer = null;
    connectDB();
  }, delayMs);
};

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/thoughtflows_db', {
      serverSelectionTimeoutMS: 8000 // give Atlas/DNS a realistic window before giving up
    });
    console.log(`[MongoDB] Connected successfully to ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.warn(`[MongoDB Notice] Could not connect (${error.message}).`);
    console.warn(`[MongoDB Notice] Common causes: Atlas cluster paused, your current IP not in Atlas Network Access, or no internet/DNS from this machine right now.`);
    console.warn(`[MongoDB Notice] Retrying in 8s — requests needing the database will return 503 until it connects.`);
    scheduleRetry();
    return false;
  }
};

// Visibility + auto-recovery for connection drops that happen *after* a
// successful initial connect (Atlas blips, network hiccups, laptop sleep/wake).
mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] Connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Disconnected — requests needing the database will return 503 until it reconnects.');
  scheduleRetry();
});

mongoose.connection.on('reconnected', () => {
  console.log('[MongoDB] Reconnected.');
});
