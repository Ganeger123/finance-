require('dotenv').config();
const express = require('express');
const app = express();
const authRouter = require('./routes/auth');
const jwt = require('jsonwebtoken');
const db = require('./db');

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'SUPER_SECRET_KEY';

app.use(express.json());
app.use('/auth', authRouter);

// simple middleware to protect routes
function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing Authorization header' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'Invalid Authorization header' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// example protected endpoint for dashboard stats (aggregate totals)
app.get('/dashboard/stats', verifyToken, (req, res) => {
  const userId = req.user.id;
  const income = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type = 'income' AND user_id = ?").get(userId).total;
  const expense = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type = 'expense' AND user_id = ?").get(userId).total;
  const profit = income - expense;
  res.json({ income, expense, profit });
});

app.get('/', (req, res) => res.json({ status: 'FinCore backend running' }));

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
