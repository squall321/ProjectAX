const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://cae_admin:cae_dev_2026@localhost:5432/cae_ontology',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client:', err);
});

module.exports = pool;
