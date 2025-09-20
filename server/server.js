// server/server.js (FINAL & CRASH-PROOF FOR DEPLOYMENT)

// =================================================================
// IMPORTS
// =================================================================
const http = require("http");
const path = require('path');
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

connectDB();

// <<< --- YEH FINAL, CORRECT CORS LOGIC HAI (HANDLES MULTIPLE URLS) --- >>>
const allowedOriginsString = process.env.CLIENT_URL || "http://localhost:3000";
const allowedOrigins = allowedOriginsString.split(',').map(origin => origin.trim());

console.log(`[CORS CONFIG] Server will allow requests from:`, allowedOrigins);

const corsOptions = {
    // Ab hum yahan URLs ki array pass kar rahe hain, jo bilkul sahi hai
    origin: allowedOrigins,
    credentials: true,
};

const io = socketIo(server, {
  cors: corsOptions,
});
// <<< --- FINAL LOGIC YAHAN KHATAM HOTA HAI --- >>>

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

// 1. CORS Configuration
app.use(cors(corsOptions));

// 2. Security Headers with Helmet (Ismein bhi hum array use karenge)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "img-src": ["'self'", "data:", "https://res.cloudinary.com"],
        // Yahan hum allowedOrigins array ko a se handle kar rahe hain taaki crash na ho
        "connect-src": [
            "'self'", 
            ...allowedOrigins, // Saare allowed HTTP URLs
            // Har URL ke liye ek WSS (WebSocket) entry banayenge
            ...allowedOrigins.map(origin => `wss://${new URL(origin).hostname}`)
        ],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

// 3. Body Parsers for JSON and URL-encoded data
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 4. Rate Limiting to prevent API abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again after 15 minutes.",
});
app.use("/api/", apiLimiter);

// =================================================================
// API ROUTES
// =================================================================

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/calls", callRoutes);

// =================================================================
// SERVE REACT FRONTEND IN PRODUCTION
// =================================================================
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/build')));

    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
    });
}

// =================================================================
// ERROR HANDLING MIDDLEWARE
// =================================================================
app.use("/api/*", (req, res) => {
  res.status(404(json)({ message: "API endpoint not found" }));
});

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
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🔌 Socket.IO server is attached and listening.`);
});