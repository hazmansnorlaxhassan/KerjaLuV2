const db = require('./db');

async function testConnection() {
  console.log('Testing MySQL Database connection...');
  try {
    const [rows] = await db.query('SELECT VERSION() AS version');
    console.log('✅ Connection Successful!');
    console.log(`MySQL Version: ${rows[0].version}`);

    const [tables] = await db.query('SHOW TABLES');
    console.log('\nAvailable Tables in database:');
    tables.forEach(table => {
      console.log(`- ${Object.values(table)[0]}`);
    });

    const [users] = await db.query('SELECT COUNT(*) as count FROM users');
    console.log(`\nTotal Users Seeded: ${users[0].count}`);

    const [jobs] = await db.query('SELECT COUNT(*) as count FROM jobs');
    console.log(`Total Jobs Seeded: ${jobs[0].count}`);

    const [gigs] = await db.query('SELECT COUNT(*) as count FROM gigs');
    console.log(`Total Gigs Seeded: ${gigs[0].count}`);

    console.log('\nDatabase setup looks 100% correct! You are ready to run the server.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection Failed!');
    console.error(error.message);
    process.exit(1);
  }
}

testConnection();
