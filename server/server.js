// ============================================================
//   OPTICUS BACKEND — Servidor Principal
//   Express.js + MySQL (mysql2)
// ============================================================

import express  from "express";
import cors     from "cors";
import dotenv   from "dotenv";
import { initializeDatabase } from "./config/db.js";

// ── Importação de Rotas ──────────────────────────────────
import authRoutes     from "./routes/authRoutes.js";
import orderRoutes    from "./routes/orderRoutes.js";
import paymentRoutes  from "./routes/paymentRoutes.js";
import designRoutes   from "./routes/designRoutes.js";
import productRoutes  from "./routes/productRoutes.js";    // ← NOVO
import categoryRoutes from "./routes/categoryRoutes.js";  // ← NOVO
import stockRoutes    from "./routes/stockRoutes.js";     // ← NOVO

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middlewares Globais ──────────────────────────────────
//   CORS: aceita localhost (dev) + Vercel (produção)
//   FRONTEND_URL = URL exata do Vercel (definida no Railway após o deploy)
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  process.env.FRONTEND_URL,           // ex: https://di-poly-opticus.vercel.app
].filter(Boolean);                    // remove undefined se FRONTEND_URL não estiver definida

app.use(cors({
  origin: (origin, callback) => {
    // Permite requisições sem origin (Postman, mobile, curl)
    if (!origin) return callback(null, true);
    // Permite qualquer subdomínio do Vercel durante preview deploys
    if (origin.endsWith(".vercel.app")) return callback(null, true);
    // Verifica lista de origens permitidas
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS bloqueado para origem: ${origin}`));
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger de requisições
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString().split("T")[1].slice(0, 8)}] ${req.method} ${req.url}`);
  next();
});

// ── Registro de Rotas ────────────────────────────────────
//   Cada rota tem um prefixo /api/<recurso>

app.use("/api/auth",       authRoutes);       // /api/auth/register, /api/auth/login ...
app.use("/api/orders",     orderRoutes);      // /api/orders, /api/orders/:id/status ...
app.use("/api/payments",   paymentRoutes);    // /api/payments/create-billing, /webhook ...
app.use("/api/designs",    designRoutes);     // /api/designs (Creator Studio)
app.use("/api/products",   productRoutes);    // /api/products (catálogo)
app.use("/api/categories", categoryRoutes);   // /api/categories
app.use("/api/stock",      stockRoutes);      // /api/stock (controle de estoque)

// ── Health Check ─────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    success: true,
    status:  "Server online",
    db:      "MySQL",
    version: "2.0.0"
  });
});

// ── Rota não encontrada ───────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Rota não encontrada." });
});

// ── Handler Global de Erros ───────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Erro não tratado:", err);
  res.status(500).json({ success: false, error: "Erro interno do servidor." });
});

// ── Inicialização ─────────────────────────────────────────
async function startServer() {
  // Inicializa o banco (cria tabelas se necessário) antes de aceitar requisições
  await initializeDatabase();

  app.listen(PORT, () => {
    console.log("==================================================");
    console.log(`🚀 OPTICUS Backend rodando na porta ${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}`);
    console.log(`🗄️  Banco: MySQL (${process.env.DB_NAME || "opticus_db"})`);
    console.log("==================================================");
    console.log("📌 Endpoints disponíveis:");
    console.log("   POST /api/auth/register");
    console.log("   POST /api/auth/login");
    console.log("   GET  /api/products");
    console.log("   GET  /api/categories");
    console.log("   GET  /api/stock");
    console.log("   GET  /api/orders");
    console.log("   GET  /api/payments");
    console.log("==================================================");
  });
}

startServer();
