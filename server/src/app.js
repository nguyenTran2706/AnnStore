require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./db');
const errorHandler = require('./middleware/errorHandler');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const reviewRoutes = require('./routes/reviews');

const app = express();

/* -- Middleware -- */
app.use(cors());
app.use(express.json());

/* -- Ensure a (cached) MongoDB connection before handling any request.
      Safe for serverless: connectDB() reuses the pooled connection. -- */
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

/* -- Customer-uploaded review photos (local dev fallback only; on Vercel
      these live in Blob storage and are served from absolute URLs). -- */
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

/* -- Routes -- */
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);

/* -- Store config (client reads tax rate from here) -- */
app.get('/api/config', (req, res) => {
  res.json({
    taxRate: Number(process.env.TAX_RATE ?? 0.1),
    currency: 'USD',
    googleReviewUrl: process.env.GOOGLE_REVIEW_URL || null,
  });
});

/* -- Health check -- */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/* -- Error handler (must be last) -- */
app.use(errorHandler);

module.exports = app;
