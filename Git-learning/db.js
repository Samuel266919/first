const sqlite3 = require('sqlite3')
const { open } = require('sqlite')

let db

async function initDb() {
  db = await open({ filename: './data.sqlite', driver: sqlite3.Database })
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'student'
    );
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      description TEXT,
      author_id INTEGER,
      FOREIGN KEY(author_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER,
      title TEXT,
      content TEXT,
      FOREIGN KEY(course_id) REFERENCES courses(id)
    );
  `)
}

function getDb() { return db }

module.exports = { initDb, getDb }
