const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'fincore.db');
const db = new Database(dbPath);

// users table
db.prepare(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT UNIQUE,
  password TEXT,
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'approved'
)
`).run();

// transactions table (simple)
db.prepare(`
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  amount REAL,
  category TEXT,
  type TEXT,
  date TEXT,
  user_id INTEGER
)
`).run();

module.exports = db;
