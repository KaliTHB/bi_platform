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

async function runSeeds() {
  try {
    console.log('Starting database seeding...');
    
    const seedsPath = path.join(__dirname, '../src/db/seeds');
    
    // Get seed files
    const seedFiles = fs.readdirSync(seedsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    // Run seeds
    for (const file of seedFiles) {
      console.log(`Running seed: ${file}`);
      const sql = fs.readFileSync(path.join(seedsPath, file), 'utf8');
      await pool.query(sql);
      console.log(`✓ Seed ${file} completed`);
    }
    
    console.log('All seeds completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}
