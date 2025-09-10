// Simple Express server connecting to MariaDB to store participants and messages
// Configure database credentials via environment variables
// Expected table:
// CREATE TABLE entries (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   name VARCHAR(255),
//   guess ENUM('garcon','fille'),
//   correct TINYINT(1),
//   message TEXT,
//   time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );

const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gender_reveal'
});

// fetch all entries
app.get('/api/entries', async (_req, res) => {
  const [rows] = await pool.query('SELECT id,name,guess,correct,message,time FROM entries ORDER BY time ASC');
  res.json(rows);
});

// create new entry
app.post('/api/entries', async (req, res) => {
  const { name, guess, correct } = req.body;
  const [result] = await pool.query(
    'INSERT INTO entries(name,guess,correct) VALUES (?,?,?)',
    [name, guess, correct ? 1 : 0]
  );
  res.json({ id: result.insertId });
});

// save message for an entry
app.post('/api/entries/:id/message', async (req, res) => {
  const { message } = req.body;
  await pool.query('UPDATE entries SET message=? WHERE id=?', [message, req.params.id]);
  res.json({ ok: true });
});

// guestbook messages only
app.get('/api/guestbook', async (_req, res) => {
  const [rows] = await pool.query('SELECT name,message,time FROM entries WHERE message <> "" ORDER BY time DESC');
  res.json(rows);
});

// statistics (counts of guesses and correct ones)
app.get('/api/stats', async (_req, res) => {
  const [rows] = await pool.query(
    'SELECT\n      SUM(guess="garcon") AS garcon,\n      SUM(guess="fille") AS fille,\n      SUM(correct=1) AS ok,\n      COUNT(*) AS total\n     FROM entries'
  );
  res.json(rows[0]);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
