const { Pool } = require('pg');

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Database connected successfully at', res.rows[0].now);
  }
});

// Initialize the database by creating necessary tables
async function initializeDatabase() {
  try {
    // Create cigarette_data table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cigarette_data (
        id SERIAL PRIMARY KEY,
        log_time TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create settings table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(50) PRIMARY KEY,
        value JSONB NOT NULL
      );
    `);

    // Insert default daily target if it doesn't exist
    const targetResult = await pool.query('SELECT * FROM settings WHERE key = $1', ['daily_target']);
    if (targetResult.rowCount === 0) {
      await pool.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2)',
        ['daily_target', JSON.stringify(10)]
      );
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error.message);
  }
}

// Get all cigarette log entries
async function getLogEntries() {
  try {
    const result = await pool.query('SELECT log_time FROM cigarette_data ORDER BY log_time');
    return result.rows.map(row => row.log_time);
  } catch (error) {
    console.error('Error fetching log entries:', error.message);
    return [];
  }
}

// Add a new cigarette log entry
async function addLogEntry() {
  try {
    const result = await pool.query('INSERT INTO cigarette_data (log_time) VALUES (NOW()) RETURNING log_time');
    return result.rows[0].log_time;
  } catch (error) {
    console.error('Error adding log entry:', error.message);
    return null;
  }
}

// Remove the most recent cigarette log entry
async function removeLastLogEntry() {
  try {
    const lastEntry = await pool.query('SELECT id FROM cigarette_data ORDER BY log_time DESC LIMIT 1');
    
    if (lastEntry.rowCount === 0) {
      return false;
    }
    
    const lastId = lastEntry.rows[0].id;
    await pool.query('DELETE FROM cigarette_data WHERE id = $1', [lastId]);
    
    return true;
  } catch (error) {
    console.error('Error removing last log entry:', error.message);
    return false;
  }
}

// Get the daily target
async function getDailyTarget() {
  try {
    const result = await pool.query('SELECT value FROM settings WHERE key = $1', ['daily_target']);
    
    if (result.rowCount === 0) {
      return 10; // Default target
    }
    
    return JSON.parse(result.rows[0].value);
  } catch (error) {
    console.error('Error fetching daily target:', error.message);
    return 10; // Default target
  }
}

// Update the daily target
async function setDailyTarget(target) {
  try {
    await pool.query(
      'UPDATE settings SET value = $1 WHERE key = $2',
      [JSON.stringify(target), 'daily_target']
    );
    return true;
  } catch (error) {
    console.error('Error updating daily target:', error.message);
    return false;
  }
}

module.exports = {
  initializeDatabase,
  getLogEntries,
  addLogEntry,
  removeLastLogEntry,
  getDailyTarget,
  setDailyTarget
};