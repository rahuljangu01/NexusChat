// server/server.js (UPDATED & ENHANCED)

// =================================================================
// IMPORTS
// =================================================================
// Core Node Modules
const http = require("http");

// Third-party Libraries
const express = require("express");
const socketIo = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

// Internal Modules
const connectDB = require("./config/database");
const socketHandler = require("./socket/socketHandler");

// Route Imports
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const connectionRoutes = require("./routes/connections");
const messageRoutes = require("./routes/messages");
const groupRoutes = require("./routes/groups");
const uploadRoutes = require("./routes/upload");
const statusRoutes = require("./routes/status");
const callRoutes = require("./routes/calls");

// =================================================================
// INITIALIZATION
// =================================================================
const app = express();
const server = http.createServer(app);

// =================================================================
// DATABASE & SOCKET.IO SETUP
// =================================================================

// Connect to MongoDB Database
connectDB();

// Setup Allowed Origins for CORS
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000,http://localhost:5001").split(',');

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

// Make `io` instance accessible to our controllers
app.set('io', io);

// Attach the main socket connection handler
socketHandler(io);

app.use((req, res, next) => {
    req.userSocketMap = io.userSocketMap;
    next();
});

// =================================================================
// CORE MIDDLEWARE
// =================================================================

// 1. CORS Configuration - Allow requests only from specified origins
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('This origin is not allowed by CORS'));
    }
  }
}));

// 2. Security Headers with Helmet
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));

// 3. Body Parsers for JSON and URL-encoded data
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 4. Rate Limiting to prevent API abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again after 15 minutes.",
});
app.use("/api/", apiLimiter);


// =================================================================
// API ROUTES
// =================================================================

// Simple Health Check Route
app.get("/api", (req, res) => {
  res.status(200).json({ message: "Nexus API is up and running!", status: "OK" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/calls", callRoutes);


// =================================================================
// ERROR HANDLING MIDDLEWARE
// =================================================================

// Handle 404 for any API routes not found
app.use("/api/*", (req, res) => {
  res.status(404).json({ message: "API endpoint not found" });
});

// Global Error Handler - Catches all errors from routes
app.use((err, req, res, next) => {
  console.error("Global Error Handler:", err.stack);
  res.status(err.status || 500).json({ 
    message: err.message || "An unexpected error occurred on the server." 
  });
});


// =================================================================
// START SERVER
// =================================================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO server is attached and listening.`);
});