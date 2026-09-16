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

      // Auto-migration: check if phone column exists in users (for WhatsApp communication)
      try {
        await pool.query('SELECT phone FROM users LIMIT 1');
      } catch (colErr) {
        if (colErr.code === 'ER_BAD_FIELD_ERROR') {
          await pool.query("ALTER TABLE users ADD COLUMN phone VARCHAR(30) NULL DEFAULT '+673 8123456'");
          console.log('Migration: Added phone column to users table for WhatsApp communication.');
        }
      }

      // Seed/update realistic Brunei phone numbers for demo users if default or null
      await pool.query(`
        UPDATE users SET phone = '+673 8765432' WHERE username = 'john_employer' AND (phone IS NULL OR phone = '+673 8123456');
        UPDATE users SET phone = '+673 8912345' WHERE username = 'jane_jobseeker' AND (phone IS NULL OR phone = '+673 8123456');
        UPDATE users SET phone = '+673 8345678' WHERE username = 'bob_jobseeker' AND (phone IS NULL OR phone = '+673 8123456');
        UPDATE users SET phone = '+673 8888888' WHERE username = 'system_admin' AND (phone IS NULL OR phone = '+673 8123456');
      `);

      // Create new tables if they don't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          sender_id INT NOT NULL,
          receiver_id INT NOT NULL,
          content TEXT NOT NULL,
          subject VARCHAR(150) NULL DEFAULT 'Direct Inquiry',
          whatsapp_url VARCHAR(500) NULL,
          channel VARCHAR(30) NOT NULL DEFAULT 'whatsapp',
          status VARCHAR(30) NOT NULL DEFAULT 'logged',
          is_read TINYINT(1) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      // Auto-migration: add WhatsApp communication columns to messages if missing
      try {
        await pool.query('SELECT subject, whatsapp_url, channel, status FROM messages LIMIT 1');
      } catch (msgErr) {
        if (msgErr.code === 'ER_BAD_FIELD_ERROR') {
          try { await pool.query("ALTER TABLE messages ADD COLUMN subject VARCHAR(150) NULL DEFAULT 'Direct Inquiry'"); } catch(e){}
          try { await pool.query("ALTER TABLE messages ADD COLUMN whatsapp_url VARCHAR(500) NULL"); } catch(e){}
          try { await pool.query("ALTER TABLE messages ADD COLUMN channel VARCHAR(30) NOT NULL DEFAULT 'whatsapp'"); } catch(e){}
          try { await pool.query("ALTER TABLE messages ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'logged'"); } catch(e){}
          console.log('Migration: Added WhatsApp communication columns to messages table.');
        }
      }

      // Seed initial sample communication records if empty
      const [msgCount] = await pool.query('SELECT COUNT(*) AS count FROM messages');
      if (msgCount[0].count === 0) {
        await pool.query(`
          INSERT INTO messages (sender_id, receiver_id, content, subject, channel, whatsapp_url, status, created_at) VALUES
          (2, 3, 'Hi Jane, I saw your Web Development gig on KerjaLu and would like to hire you for our API landing page project. Can we discuss your availability on WhatsApp?', 'Web Development Gig Inquiry', 'whatsapp', 'https://wa.me/6738912345?text=Hi%20Jane%2C%20I%20saw%20your%20Web%20Development%20gig%20on%20KerjaLu', 'logged', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
          (3, 2, 'Hi John! Yes, I am available to start on your project immediately. I have delivered similar Express APIs and responsive designs.', 'Re: Web Development Gig Inquiry', 'whatsapp', 'https://wa.me/6738765432?text=Hi%20John!%20Yes%2C%20I%20am%20available%20to%20start%20on%20your%20project', 'logged', DATE_SUB(NOW(), INTERVAL 1 HOUR)),
          (2, 4, 'Hello Bob, regarding your proposal for the Logo Design gig, could you provide samples of vector SVG logos you previously designed?', 'Logo Design Application Discussion', 'whatsapp', 'https://wa.me/6738345678?text=Hello%20Bob%2C%20regarding%20your%20proposal%20for%20the%20Logo%20Design', 'logged', DATE_SUB(NOW(), INTERVAL 30 MINUTE));
        `);
        console.log('Seeded sample WhatsApp communication records.');
      }

      await pool.query(`
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
      pool = mysql.createPool({
        ...dbConfig,
        database: process.env.DB_NAME || 'kerjalu_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
    }
    try {
      return await pool.query(sql, params);
    } catch (err) {
      if (err.code === 'ECONNRESET' || err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.warn('MySQL connection dropped, recreating pool and retrying query...');
        pool = mysql.createPool({
          ...dbConfig,
          database: process.env.DB_NAME || 'kerjalu_db',
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0
        });
        return await pool.query(sql, params);
      }
      throw err;
    }
  },
  pool: () => pool
};
