import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

// Create connection pool targeting the Supabase database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export async function initializeDatabase() {
  try {
    // Check connection
    await pool.query('SELECT NOW()');
    console.log("Connected to PostgreSQL (Supabase) successfully.");

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'client',
        factory_name VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(255) PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        factory_id VARCHAR(255) NOT NULL,
        factory_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending Payment',
        total NUMERIC(10, 2) NOT NULL,
        custom_specs TEXT NOT NULL,
        abacate_billing_id VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create saved_designs table for cloud sync
    await pool.query(`
      CREATE TABLE IF NOT EXISTS saved_designs (
        id VARCHAR(255) PRIMARY KEY,
        customer_email VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        model VARCHAR(255) NOT NULL,
        color VARCHAR(50) NOT NULL,
        is_sunglasses BOOLEAN DEFAULT FALSE,
        anti_reflective BOOLEAN DEFAULT FALSE,
        temple_style VARCHAR(50) DEFAULT 'standard',
        top_bar BOOLEAN DEFAULT FALSE,
        bridge_style VARCHAR(50) DEFAULT 'keyhole',
        frame_profile VARCHAR(50) DEFAULT 'medium',
        temple_open NUMERIC(4, 2) DEFAULT 0.00,
        published BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_email) REFERENCES users(email) ON DELETE CASCADE
      );
    `);

    // Enable Row Level Security (RLS) to secure PostgREST API and clear Supabase warnings
    await pool.query('ALTER TABLE users ENABLE ROW LEVEL SECURITY;');
    await pool.query('ALTER TABLE orders ENABLE ROW LEVEL SECURITY;');
    await pool.query('ALTER TABLE saved_designs ENABLE ROW LEVEL SECURITY;');

    // Seed default users if empty
    const { rows } = await pool.query("SELECT COUNT(*) as count FROM users;");
    if (parseInt(rows[0].count) === 0) {
      console.log("Seeding default system accounts...");
      const pwHash = await bcrypt.hash("123456", 10);
      
      const seedUsers = [
        ["client-1", "Client Demo", "client@opticus.com", pwHash, "client", null],
        ["factory-demo", "Factory Demo", "factory@opticus.com", pwHash, "factory", "Demo Factory"],
        ["staff-1", "Opticus Staff", "staff@opticus.com", pwHash, "staff", null]
      ];

      for (const user of seedUsers) {
        await pool.query(
          "INSERT INTO users (id, name, email, password_hash, role, factory_name) VALUES ($1, $2, $3, $4, $5, $6)",
          user
        );
      }
      console.log("System accounts seeded successfully.");
    }
  } catch (err) {
    console.error("PostgreSQL initialization failed:", err.message);
  }
}

export default pool;
