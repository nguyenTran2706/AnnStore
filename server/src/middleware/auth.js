const jwt = require('jsonwebtoken');
const User = require('../models/User');

/* ── requireAuth — verify Bearer JWT and load req.user ── */
const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: 'Not authenticated' });

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/* ── requireAdmin — requireAuth + admin role ── */
const requireAdmin = [
  requireAuth,
  (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  },
];

module.exports = { requireAuth, requireAdmin };
