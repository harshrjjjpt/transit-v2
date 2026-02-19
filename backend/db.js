const { Pool } = require('pg')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(__dirname, '.env') })

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is required in environment variables')
}

const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

module.exports = { pool }
