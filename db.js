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
      console.log('Database tables verified.');
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
