// server/server.js (FINAL, ROBUST & RESPONSIVE FIX)

const http = require("http");
const path = require('path');
const express = require("express");
const socketIo = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const connectDB = require("./config/database");
const socketHandler = require("./socket/socketHandler");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const connectionRoutes = require("./routes/connections");
const messageRoutes = require("./routes/messages");
const groupRoutes = require("./routes/groups");
const uploadRoutes = require("./routes/upload");
const statusRoutes = require("./routes/status");
const callRoutes = require("./routes/calls");

const app = express();
const server = http.createServer(app);

connectDB();

const allowedOriginsString = process.env.CLIENT_URL || "http://localhost:3000";
const allowedOrigins = allowedOriginsString.split(',').map(origin => origin.trim());

console.log(`[CORS CONFIG] Server will allow requests from:`, allowedOrigins);

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
};

const io = socketIo(server, { cors: corsOptions });

app.set('io', io);
socketHandler(io);

app.use((req, res, next) => {
    req.userSocketMap = io.userSocketMap;
    next();
});

app.use(cors(corsOptions));
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests, please try again after 15 minutes.",
});
app.use("/api/", apiLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/calls", callRoutes);

if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/build')));
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
    });
}

app.use("/api/*", (req, res) => {
  res.status(404).json({ message: "API endpoint not found" });
});

app.use((err, req, res, next) => {
  console.error("Global Error Handler:", err.stack);
  res.status(err.status || 500).json({
    message: err.message || "An unexpected server error occurred."
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🔌 Socket.IO server is attached and listening.`);
});