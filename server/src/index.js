require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const reviewRoutes = require('./routes/reviews');

const path = require('path');

const app = express();
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shopflow';

if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET environment variable. Add it to server/.env and restart.');
  process.exit(1);
}

/* -- Middleware -- */
app.use(cors());
app.use(express.json());

/* -- Serve product images from project root /images folder -- */
app.use('/images', express.static(path.join(__dirname, '../../images')));

/* -- Customer-uploaded review photos -- */
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

/* -- Start server -- */
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log('Server running on http://localhost:' + PORT);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
