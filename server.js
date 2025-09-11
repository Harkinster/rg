const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gender_reveal'
});

// === STATIC FILES ===
app.use("/rg", express.static(__dirname));

// === API BASE ===
const apiBase = "/rg/api";

// fetch all entries
app.get(`${apiBase}/entries`, async (_req, res) => {
  const [rows] = await pool.query('SELECT id,name,guess,correct,message,time FROM entries ORDER BY time ASC');
  res.json(rows);
});

// create new entry
app.post(`${apiBase}/entries`, async (req, res) => {
  const { name, guess, correct } = req.body;
  const [result] = await pool.query(
    'INSERT INTO entries(name,guess,correct) VALUES (?,?,?)',
    [name, guess, correct ? 1 : 0]
  );
  res.json({ id: result.insertId });
});

// save message
app.post(`${apiBase}/entries/:id/message`, async (req, res) => {
  const { message } = req.body;
  await pool.query('UPDATE entries SET message=? WHERE id=?', [message, req.params.id]);
  res.json({ ok: true });
});

// guestbook
app.get(`${apiBase}/guestbook`, async (_req, res) => {
  const [rows] = await pool.query('SELECT name,message,time FROM entries WHERE message <> "" ORDER BY time DESC');
  res.json(rows);
});

// stats
app.get(`${apiBase}/stats`, async (_req, res) => {
  const [rows] = await pool.query(
    'SELECT SUM(guess="garcon") AS garcon, SUM(guess="fille") AS fille, SUM(correct=1) AS ok, COUNT(*) AS total FROM entries'
  );
  res.json(rows[0]);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});