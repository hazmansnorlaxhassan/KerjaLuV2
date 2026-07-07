const db = require('./db');

async function migrate() {
  console.log('Running database migration: Adding location columns...');
  try {
    // 1. Alter users table
    try {
      await db.query('ALTER TABLE users ADD COLUMN latitude DECIMAL(10, 8) NULL AFTER status');
      console.log('Added latitude to users.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('latitude column already exists in users.');
      } else {
        throw e;
      }
    }
    
    try {
      await db.query('ALTER TABLE users ADD COLUMN longitude DECIMAL(11, 8) NULL AFTER latitude');
      console.log('Added longitude to users.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('longitude column already exists in users.');
      } else {
        throw e;
      }
    }

    // 2. Alter jobs table
    try {
      await db.query('ALTER TABLE jobs ADD COLUMN latitude DECIMAL(10, 8) NULL AFTER status');
      console.log('Added latitude to jobs.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('latitude column already exists in jobs.');
      } else {
        throw e;
      }
    }
    
    try {
      await db.query('ALTER TABLE jobs ADD COLUMN longitude DECIMAL(11, 8) NULL AFTER latitude');
      console.log('Added longitude to jobs.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('longitude column already exists in jobs.');
      } else {
        throw e;
      }
    }

    // 3. Update seeded coordinates
    console.log('Updating seeded users coordinates...');
    await db.query('UPDATE users SET latitude = 5.98040000, longitude = 116.07350000 WHERE id = 1');
    await db.query('UPDATE users SET latitude = 6.03360000, longitude = 116.12140000 WHERE id = 2');
    await db.query('UPDATE users SET latitude = 6.03670000, longitude = 116.11850000 WHERE id = 3');
    await db.query('UPDATE users SET latitude = 5.98970000, longitude = 116.09680000 WHERE id = 4');

    console.log('Updating seeded jobs coordinates...');
    await db.query('UPDATE jobs SET latitude = 6.03360000, longitude = 116.12140000 WHERE id = 1');
    await db.query('UPDATE jobs SET latitude = 6.03000000, longitude = 116.13000000 WHERE id = 2');

    console.log('Migration successful!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
