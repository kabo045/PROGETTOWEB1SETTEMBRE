const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:0000@localhost:5432/web'
});


module.exports = pool;
