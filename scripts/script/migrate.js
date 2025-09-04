// api-services/scripts/migrate.js
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'bi_platform',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function runMigrations() {
  try {
    console.log('Starting database migrations...');
    
    const migrationsPath = path.join(__dirname, '../src/db/migrations');
    const functionPath = path.join(__dirname, '../src/db/functions');
    
    // Get migration files
    const migrationFiles = fs.readdirSync(migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    // Run migrations
    for (const file of migrationFiles) {
      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsPath, file), 'utf8');
      await pool.query(sql);
      console.log(`✓ Migration ${file} completed`);
    }
    
    // Get function files
    if (fs.existsSync(functionPath)) {
      const functionFiles = fs.readdirSync(functionPath)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      // Run function files
      for (const file of functionFiles) {
        console.log(`Running function: ${file}`);
        const sql = fs.readFileSync(path.join(functionPath, file), 'utf8');
        await pool.query(sql);
        console.log(`✓ Function ${file} completed`);
      }
    }
    
    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
