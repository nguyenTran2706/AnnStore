const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const fs = require('fs/promises');
const path = require('path');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Review = require('../models/Review');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAdmin);

/* ── Helper: send validation errors ── */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/* ── GET /api/admin/stats — dashboard headline numbers ── */
router.get('/stats', async (req, res, next) => {
  try {
    const [revenueAgg, orderCount, processingCount, productCount, customerCount, lowStock, recentOrders] =
      await Promise.all([
        // Revenue is reported excluding tax (sum of subtotals) so it matches
        // the category breakdown, which is built from item prices.
        Order.aggregate([
          { $match: { status: { $ne: 'cancelled' } } },
          { $group: { _id: null, total: { $sum: '$subtotal' } } },
        ]),
        Order.countDocuments(),
        Order.countDocuments({ status: 'processing' }),
        Product.countDocuments(),
        User.countDocuments({ role: 'customer' }),
        Product.find({ stock: { $lte: 3 } })
          .sort({ stock: 1 })
          .limit(10)
          .select('name imageUrl stock category'),
        Order.find().sort({ createdAt: -1 }).limit(5).populate('userId', 'name email'),
      ]);

    res.json({
      revenue: revenueAgg[0]?.total ?? 0,
      orderCount,
      processingCount,
      productCount,
      customerCount,
      lowStock,
      recentOrders,
    });
  } catch (err) {
    next(err);
  }
});

/* ── GET /api/admin/sales-report?period=week|month|year ── */
const PERIODS = {
  week: { days: 7, unit: 'day' },
  month: { days: 30, unit: 'day' },
  year: { months: 12, unit: 'month' },
};

const startOfWindow = (period, offset = 0) => {
  // offset 0 = current window, 1 = the immediately preceding window
  const now = new Date();
  if (period === 'year') {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 - offset * 12, 1));
    return d;
  }
  const days = PERIODS[period].days;
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (days - 1) - offset * days);
  return d;
};

const summarize = async (from, to) => {
  const match = { status: { $ne: 'cancelled' }, createdAt: { $gte: from, ...(to ? { $lt: to } : {}) } };
  const [totals, unitsAgg] = await Promise.all([
    Order.aggregate([
      { $match: match },
      { $group: { _id: null, revenue: { $sum: '$subtotal' }, orders: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: match },
      { $unwind: '$items' },
      { $group: { _id: null, units: { $sum: '$items.quantity' } } },
    ]),
  ]);
  const revenue = totals[0]?.revenue ?? 0;
  const orders = totals[0]?.orders ?? 0;
  return {
    revenue,
    orders,
    units: unitsAgg[0]?.units ?? 0,
    avgOrder: orders ? revenue / orders : 0,
  };
};

router.get(
  '/sales-report',
  [query('period').optional().isIn(['week', 'month', 'year'])],
  validate,
  async (req, res, next) => {
    try {
      const period = req.query.period || 'month';
      const { unit } = PERIODS[period];
      const windowStart = startOfWindow(period);
      const prevStart = startOfWindow(period, 1);
      const match = { status: { $ne: 'cancelled' }, createdAt: { $gte: windowStart } };

      const [summary, prev, buckets, byCategory, topProducts] = await Promise.all([
        summarize(windowStart, null),
        summarize(prevStart, windowStart),
        Order.aggregate([
          { $match: match },
          {
            // Buckets are UTC (see startOfWindow); acceptable for a demo store.
            $group: {
              _id: { $dateTrunc: { date: '$createdAt', unit } },
              revenue: { $sum: '$subtotal' },
              orders: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        Order.aggregate([
          { $match: match },
          { $unwind: '$items' },
          {
            $lookup: {
              from: 'products',
              localField: 'items.productId',
              foreignField: '_id',
              as: 'product',
            },
          },
          {
            $group: {
              _id: { $ifNull: [{ $first: '$product.category' }, 'Other'] },
              revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
              units: { $sum: '$items.quantity' },
            },
          },
          { $project: { _id: 0, category: '$_id', revenue: 1, units: 1 } },
          { $sort: { revenue: -1 } },
        ]),
        Order.aggregate([
          { $match: match },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.productId',
              name: { $first: '$items.name' },
              imageUrl: { $first: '$items.imageUrl' },
              revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
              units: { $sum: '$items.quantity' },
            },
          },
          { $sort: { revenue: -1 } },
          { $limit: 5 },
        ]),
      ]);

      // Fill empty buckets so the chart axis is continuous
      const found = new Map(buckets.map((b) => [new Date(b._id).getTime(), b]));
      const timeseries = [];
      const cursor = new Date(windowStart);
      const now = new Date();
      while (cursor <= now) {
        const hit = found.get(cursor.getTime());
        timeseries.push({
          date: cursor.toISOString(),
          revenue: hit ? hit.revenue : 0,
          orders: hit ? hit.orders : 0,
        });
        if (unit === 'day') cursor.setUTCDate(cursor.getUTCDate() + 1);
        else cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }

      res.json({ period, summary: { ...summary, prev }, timeseries, byCategory, topProducts });
    } catch (err) {
      next(err);
    }
  }
);

/* ── GET /api/admin/orders — every order, newest first ── */
router.get('/orders', async (req, res, next) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).populate('userId', 'name email');
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

/* ── PATCH /api/admin/orders/:id/status — advance or cancel an order ── */
const REQUIRED_FROM = { shipped: 'processing', cancelled: 'processing', delivered: 'shipped' };

router.patch(
  '/orders/:id/status',
  [
    param('id').isMongoId().withMessage('Invalid order ID'),
    body('status').isIn(['shipped', 'delivered', 'cancelled']).withMessage('Invalid status'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { status } = req.body;

      // Atomic transition guard: the update only applies when the order is in
      // the required source status, so a concurrent double-cancel gets a 400
      // instead of restoring stock twice.
      const order = await Order.findOneAndUpdate(
        { _id: req.params.id, status: REQUIRED_FROM[status] },
        { status, $push: { statusHistory: { status, at: new Date() } } },
        { new: true }
      ).populate('userId', 'name email');

      if (!order) {
        const exists = await Order.findById(req.params.id).select('status');
        if (!exists) return res.status(404).json({ message: 'Order not found' });
        return res.status(400).json({
          message: `Cannot change status from '${exists.status}' to '${status}'`,
        });
      }

      if (status === 'cancelled') {
        for (const item of order.items) {
          if (item.productId) {
            await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
          }
        }
      }

      res.json(order);
    } catch (err) {
      next(err);
    }
  }
);

/* ── PATCH /api/admin/orders/:id/tracking — staff enter the AusPost number ── */
router.patch(
  '/orders/:id/tracking',
  [
    param('id').isMongoId().withMessage('Invalid order ID'),
    body('trackingNumber')
      .trim()
      .isLength({ min: 6, max: 40 })
      .withMessage('Tracking number must be 6–40 characters')
      .matches(/^[A-Za-z0-9]+$/)
      .withMessage('Letters and digits only — no spaces or symbols'),
    body('carrier').optional().isIn(['auspost', 'cainiao']).withMessage('Invalid carrier'),
  ],
  validate,
  async (req, res, next) => {
    try {
      // Tracking can be added or corrected while the parcel is in motion,
      // but not on cancelled or already-delivered orders.
      const order = await Order.findOneAndUpdate(
        { _id: req.params.id, status: { $in: ['processing', 'shipped'] } },
        {
          trackingNumber: req.body.trackingNumber.trim().toUpperCase(),
          trackingCarrier: req.body.carrier || 'auspost',
        },
        { new: true }
      ).populate('userId', 'name email');

      if (!order) {
        const exists = await Order.findById(req.params.id).select('status');
        if (!exists) return res.status(404).json({ message: 'Order not found' });
        return res.status(400).json({
          message: `Cannot set a tracking number on a ${exists.status} order`,
        });
      }

      res.json(order);
    } catch (err) {
      next(err);
    }
  }
);

/* ── GET /api/admin/customers — users with order counts and spend ── */
router.get('/customers', async (req, res, next) => {
  try {
    const customers = await User.aggregate([
      {
        $lookup: {
          from: 'orders',
          let: { uid: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$userId', '$$uid'] }, status: { $ne: 'cancelled' } } },
            { $group: { _id: null, count: { $sum: 1 }, spent: { $sum: '$total' } } },
          ],
          as: 'orderStats',
        },
      },
      {
        $addFields: {
          orderCount: { $ifNull: [{ $first: '$orderStats.count' }, 0] },
          totalSpent: { $ifNull: [{ $first: '$orderStats.spent' }, 0] },
        },
      },
      // This whitelist is load-bearing: aggregate bypasses the schema's
      // select:false, so without it the password hash would be returned.
      { $project: { name: 1, email: 1, role: 1, createdAt: 1, orderCount: 1, totalSpent: 1 } },
      { $sort: { createdAt: -1 } },
    ]);
    res.json(customers);
  } catch (err) {
    next(err);
  }
});

/* ── PATCH /api/admin/customers/:id/role — promote / demote ── */
router.patch(
  '/customers/:id/role',
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('role').isIn(['customer', 'admin']).withMessage('Invalid role'),
  ],
  validate,
  async (req, res, next) => {
    try {
      if (req.params.id === String(req.user._id)) {
        return res.status(400).json({ message: 'You cannot change your own role' });
      }

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { role: req.body.role },
        { new: true, runValidators: true }
      ).select('name email role createdAt');
      if (!user) return res.status(404).json({ message: 'User not found' });

      res.json(user);
    } catch (err) {
      next(err);
    }
  }
);

/* ── GET /api/admin/reviews — every review, newest first ── */
router.get('/reviews', async (req, res, next) => {
  try {
    const reviews = await Review.find()
      .sort({ createdAt: -1 })
      .populate('productId', 'name imageUrl')
      .populate('userId', 'name email');
    res.json(reviews);
  } catch (err) {
    next(err);
  }
});

/* ── PATCH /api/admin/reviews/:id/reply — respond to a review ── */
router.patch(
  '/reviews/:id/reply',
  [
    param('id').isMongoId().withMessage('Invalid review ID'),
    body('text').trim().isLength({ min: 1, max: 1000 }).withMessage('Reply must be 1–1000 characters'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const review = await Review.findByIdAndUpdate(
        req.params.id,
        { reply: { text: req.body.text.trim(), at: new Date() } },
        { new: true }
      )
        .populate('productId', 'name imageUrl')
        .populate('userId', 'name email');
      if (!review) return res.status(404).json({ message: 'Review not found' });
      res.json(review);
    } catch (err) {
      next(err);
    }
  }
);

/* ── DELETE /api/admin/reviews/:id — remove a review (moderation) ── */
router.delete(
  '/reviews/:id',
  [param('id').isMongoId().withMessage('Invalid review ID')],
  validate,
  async (req, res, next) => {
    try {
      const review = await Review.findByIdAndDelete(req.params.id);
      if (!review) return res.status(404).json({ message: 'Review not found' });
      // Best-effort cleanup of uploaded photos
      for (const url of review.images || []) {
        const file = path.join(__dirname, '../../uploads/reviews', path.basename(url));
        fs.unlink(file).catch(() => {});
      }
      res.json({ message: 'Review deleted' });
    } catch (err) {
      next(err);
    }
  }
);

/* ── GET /api/admin/images — gallery of local product images ── */
const IMAGES_DIR = path.join(__dirname, '../../../images');
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const isImage = (e) => e.isFile() && IMAGE_EXTS.has(path.extname(e.name).toLowerCase());
const toUrl = (...segs) => '/images/' + segs.map(encodeURIComponent).join('/');

router.get('/images', async (req, res, next) => {
  try {
    const entries = await fs.readdir(IMAGES_DIR, { withFileTypes: true });
    const groups = [];

    const dirs = entries.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
    for (const dir of dirs) {
      const files = (await fs.readdir(path.join(IMAGES_DIR, dir.name), { withFileTypes: true }))
        .filter(isImage)
        .map((e) => ({ name: e.name, url: toUrl(dir.name, e.name) }));
      if (files.length) groups.push({ folder: dir.name, files });
    }

    const rootFiles = entries.filter(isImage).map((e) => ({ name: e.name, url: toUrl(e.name) }));
    if (rootFiles.length) groups.push({ folder: 'Other', files: rootFiles });

    res.json({ groups });
  } catch (err) {
    if (err.code === 'ENOENT') return res.json({ groups: [] });
    next(err);
  }
});

module.exports = router;
