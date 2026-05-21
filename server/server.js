import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initializeDatabase } from "./config/db.js";

// Routes imports
import authRoutes from "./routes/authRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import designRoutes from "./routes/designRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware Configurations
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log request middleware for active monitoring
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString().split("T")[1].slice(0, 8)}] ${req.method} ${req.url}`);
  next();
});

// Register REST Routes
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/designs", designRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ success: true, status: "Server is healthy and responsive." });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhanded server error:", err);
  res.status(500).json({ success: false, error: "Something went wrong on the server." });
});

// Boot Database and Listen
async function startServer() {
  await initializeDatabase();
  app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`🚀 OPTICUS Backend Server running on port ${PORT}`);
    console.log(`📡 URL API: http://localhost:${PORT}`);
    console.log(`==================================================`);
  });
}

startServer();
