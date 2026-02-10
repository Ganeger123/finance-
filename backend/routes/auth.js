const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'SUPER_SECRET_KEY';
const TOKEN_EXPIRES = '24h';

router.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(400).json({ error: 'Email already registered' });

  const hashed = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (name, email, password, status) VALUES (?, ?, ?, ?)').run(name || '', email, hashed, 'approved');
  return res.json({ message: 'User created', id: info.lastInsertRowid });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const user = db.prepare('SELECT id, email, password, role, status FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });

  if (user.status !== 'approved') return res.status(403).json({ error: 'Account not approved' });

  const token = jwt.sign({ sub: user.email, id: user.id, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES });
  return res.json({ access_token: token, token_type: 'bearer' });
});

module.exports = router;
