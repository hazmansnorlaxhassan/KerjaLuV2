const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true // Allow executing the schema in one go
};

let pool;

async function initializeDatabase() {
  try {
    // 1. Connect without database name first to create it if it doesn't exist
    const tempConnection = await mysql.createConnection(dbConfig);
    console.log('Connected to MySQL server successfully.');

    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'kerjalu_db'}\`;`);
    await tempConnection.end();

    // 2. Setup connection pool with the database specified
    pool = mysql.createPool({
      ...dbConfig,
      database: process.env.DB_NAME || 'kerjalu_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // 3. Check if tables exist by querying the 'users' table
    try {
      await pool.query('SELECT 1 FROM users LIMIT 1');
      console.log('Database tables verified. Running migrations for new feature tables if needed...');
      
      // Auto-migration: check if balance column exists in users
      try {
        await pool.query('SELECT balance FROM users LIMIT 1');
      } catch (colErr) {
        if (colErr.code === 'ER_BAD_FIELD_ERROR') {
          await pool.query('ALTER TABLE users ADD COLUMN balance DECIMAL(10,2) NOT NULL DEFAULT 1000.00');
          console.log('Migration: Added balance column to users table.');
        }
      }

      // Create new tables if they don't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          sender_id INT NOT NULL,
          receiver_id INT NOT NULL,
          content TEXT NOT NULL,
          is_read TINYINT(1) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS reviews (
          id INT AUTO_INCREMENT PRIMARY KEY,
          order_id INT NULL,
          reviewer_id INT NOT NULL,
          reviewee_id INT NOT NULL,
          gig_id INT NULL,
          rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
          comment TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (reviewee_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(150) NOT NULL,
          message TEXT NOT NULL,
          link VARCHAR(255) NULL,
          is_read TINYINT(1) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS transactions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          type ENUM('deposit', 'escrow_hold', 'escrow_release', 'refund') NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          reference_type VARCHAR(50) NULL,
          reference_id INT NULL,
          description VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
      console.log('Database schema migrations completed successfully.');
    } catch (err) {
      // If table doesn't exist, read schema.sql and execute it
      if (err.code === 'ER_NO_SUCH_TABLE') {
        console.log('Database tables not found. Initializing database schema from schema.sql...');
        const schemaPath = path.join(__dirname, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
          const schemaSql = fs.readFileSync(schemaPath, 'utf8');
          await pool.query(schemaSql);
          console.log('Database schema and seed data initialized successfully!');
        } else {
          console.warn('schema.sql file not found. Database initialization skipped.');
        }
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.error('CRITICAL: Database initialization failed!');
    console.error(error.message);
    console.log('\n--- HOW TO TROUBLESHOOT ---');
    console.log('1. Make sure your MySQL service is running.');
    console.log('2. Check your database credentials in the .env file.');
    console.log('3. Create the database "kerjalu_db" manually if necessary.\n');
  }
}

// Immediately trigger initialization
initializeDatabase();

// Export pool query wrapper
module.exports = {
  query: async (sql, params) => {
    if (!pool) {
      // If pool is not ready, establish connection synchronously/on-demand
      pool = mysql.createPool({
        ...dbConfig,
        database: process.env.DB_NAME || 'kerjalu_db'
      });
    }
    return pool.query(sql, params);
  },
  pool: () => pool
};
