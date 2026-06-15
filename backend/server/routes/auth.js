const express = require('express');
const jwt     = require('jsonwebtoken');
const fs      = require('fs');
const path    = require('path');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const usersPath = path.join(__dirname, '../data/users.json');

function loadUsers() {
  return JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
}

function toPublicUser(user) {
  return { email: user.email, name: user.name, role: user.role, company: user.company };
}

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = loadUsers().find(u => u.email.toLowerCase() === String(email).toLowerCase());
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const publicUser = toPublicUser(user);
  const token = jwt.sign(publicUser, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, user: publicUser });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
