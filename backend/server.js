const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Routes
const authRoutes = require('./routes/auth');
const serverRoutes = require('./routes/servers');
const sftpRoutes = require('./routes/sftp');
const sftpQuickRoutes = require('./routes/sftp-quick');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');

// Database
const db = require('./config/database');

// Socket handlers
const socketHandler = require('./socket/socketHandler');

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173", // Vite dev server
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/sftp', sftpRoutes);
app.use('/api/sftp/quick', sftpQuickRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// Socket.io connection handling
socketHandler(io);

// Serve frontend for production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

// Database connection test
db.authenticate()
  .then(() => {
    console.log('Database connection established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`WebSSH server running on port ${PORT}`);
});