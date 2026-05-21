import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";

const JWT_SECRET = process.env.JWT_SECRET || "opticus_premium_jwt_secret_key_2026";

// Generate JWT Helper
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export async function register(req, res) {
  const { name, email, password, role, factoryName } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, error: "Please provide name, email, and password." });
  }

  const userRole = role || "client";
  const normEmail = String(email).trim().toLowerCase();

  try {
    // Check if user already exists
    const existing = await pool.query("SELECT id FROM users WHERE email = $1;", [normEmail]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: "An account with this email already exists." });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `${userRole}-${Date.now()}`;

    // Insert user into DB
    await pool.query(
      "INSERT INTO users (id, name, email, password_hash, role, factory_name) VALUES ($1, $2, $3, $4, $5, $6);",
      [userId, name.trim(), normEmail, passwordHash, userRole, userRole === "factory" ? factoryName : null]
    );

    // Create session payload and sign JWT
    const payload = {
      id: userId,
      name: name.trim(),
      email: normEmail,
      role: userRole,
      factoryName: userRole === "factory" ? factoryName : null
    };
    const token = generateToken(payload);

    return res.status(201).json({
      success: true,
      token,
      user: payload
    });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({ success: false, error: "Registration failed due to server error." });
  }
}

export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: "Please provide email and password." });
  }

  const normEmail = String(email).trim().toLowerCase();

  try {
    // Find user in DB
    const result = await pool.query("SELECT * FROM users WHERE email = $1;", [normEmail]);
    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, error: "Invalid email or password." });
    }
    const user = result.rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: "Invalid email or password." });
    }

    // Create session payload and sign JWT
    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      factoryName: user.factory_name
    };
    const token = generateToken(payload);

    return res.json({
      success: true,
      token,
      user: payload
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, error: "Login failed due to server error." });
  }
}

export async function getMe(req, res) {
  try {
    const result = await pool.query(
      "SELECT id, name, email, role, factory_name as \"factoryName\", created_at as \"createdAt\" FROM users WHERE id = $1;",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "User profile not found." });
    }
    
    const user = result.rows[0];

    return res.json({
      success: true,
      user
    });
  } catch (err) {
    console.error("Fetch profile error:", err);
    return res.status(500).json({ success: false, error: "Failed to load user profile." });
  }
}

export async function getUsers(req, res) {
  try {
    const result = await pool.query("SELECT id, name, email, role, factory_name as \"factoryName\", created_at as \"createdAt\" FROM users ORDER BY created_at DESC;");
    
    return res.json({
      success: true,
      users: result.rows
    });
  } catch (err) {
    console.error("Fetch users error:", err);
    return res.status(500).json({ success: false, error: "Failed to load users list." });
  }
}
