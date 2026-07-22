const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { put } = require('@vercel/blob');
const { body, param, validationResult } = require('express-validator');
const Review = require('../models/Review');
const Order = require('../models/Order');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/* ── Helper: send validation errors ── */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/* ── Photo uploads: 3 images max, image types only. Filenames are random
      (never the client's name). Files are held in memory then pushed to Vercel
      Blob in prod, or written to local disk in dev. NOTE the per-file limit is
      kept small: Vercel serverless caps the request body at ~4.5MB total. ── */
const UPLOAD_DIR = path.join(__dirname, '../../uploads/reviews');

const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024, files: 3 },
  fileFilter: (req, file, cb) => cb(null, Boolean(EXT_BY_MIME[file.mimetype])),
});

/* Persist one uploaded photo, returning the URL to store on the review.
   Uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set (prod), else local disk. */
async function saveReviewImage(file) {
  const filename = crypto.randomBytes(12).toString('hex') + EXT_BY_MIME[file.mimetype];
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { url } = await put(`reviews/${filename}`, file.buffer, {
      access: 'public',
      contentType: file.mimetype,
    });
    return url; // absolute https URL served by Blob's CDN
  }
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), file.buffer);
  return `/uploads/reviews/${filename}`;
}

/* ── GET /api/reviews/product/:id — public list + rating summary ── */
router.get(
  '/product/:id',
  [param('id').isMongoId().withMessage('Invalid product ID')],
  validate,
  async (req, res, next) => {
    try {
      const reviews = await Review.find({ productId: req.params.id })
        .sort({ createdAt: -1 })
        .populate('userId', 'name');
      const count = reviews.length;
      const avg = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
      res.json({ reviews, count, avg: Math.round(avg * 10) / 10 });
    } catch (err) {
      next(err);
    }
  }
);

/* ── GET /api/reviews/mine — which order items this user has reviewed ── */
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const mine = await Review.find({ userId: req.user._id }).select('orderId productId rating');
    res.json(mine);
  } catch (err) {
    next(err);
  }
});

/* ── POST /api/reviews — create (multipart: rating, comment, images[]) ── */
router.post(
  '/',
  requireAuth,
  upload.array('images', 3),
  [
    body('productId').isMongoId().withMessage('Invalid product ID'),
    body('orderId').isMongoId().withMessage('Invalid order ID'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1–5'),
    body('comment').optional().trim().isLength({ max: 1000 }).withMessage('Comment too long'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { productId, orderId, rating, comment = '' } = req.body;
      const userId = req.user._id;

      // Eligibility: your order, delivered, and it contains this product
      const order = await Order.findOne({ _id: orderId, userId });
      if (!order) return res.status(404).json({ message: 'Order not found' });
      if (order.status !== 'delivered') {
        return res.status(400).json({ message: 'You can review products once the order is delivered' });
      }
      if (!order.items.some((i) => String(i.productId) === productId)) {
        return res.status(400).json({ message: 'This product is not part of that order' });
      }

      const existing = await Review.findOne({ orderId, productId, userId });
      if (existing) {
        return res.status(409).json({ message: 'You have already reviewed this product for this order' });
      }

      const review = await Review.create({
        productId,
        userId,
        orderId,
        rating: Number(rating),
        comment,
        images: await Promise.all((req.files || []).map(saveReviewImage)),
      });
      const populated = await review.populate('userId', 'name');
      res.status(201).json(populated);
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ message: 'You have already reviewed this product for this order' });
      }
      next(err);
    }
  }
);

module.exports = router;
