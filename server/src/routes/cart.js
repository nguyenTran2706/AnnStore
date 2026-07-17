const express = require('express');
const { body, param, validationResult } = require('express-validator');
const CartItem = require('../models/CartItem');
const Product = require('../models/Product');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

/* ── Helper: send validation errors ── */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/* ── Helper: current user's populated cart, stale items cleaned ── */
const loadCart = async (userId) => {
  const items = await CartItem.find({ userId })
    .populate('productId')
    .sort({ createdAt: -1 });

  // Auto-clean stale cart items whose product was deleted or re-seeded
  const staleIds = items.filter((i) => !i.productId).map((i) => i._id);
  if (staleIds.length > 0) {
    await CartItem.deleteMany({ _id: { $in: staleIds } });
  }

  return items.filter((i) => i.productId);
};

/* ── GET /api/cart — current user's cart (populated) ── */
router.get('/', async (req, res, next) => {
  try {
    res.json(await loadCart(req.user._id));
  } catch (err) {
    next(err);
  }
});

/* ── POST /api/cart — add item (or increment qty if already in cart) ── */
router.post(
  '/',
  [
    body('productId').isMongoId().withMessage('Invalid product ID'),
    body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { productId, quantity = 1 } = req.body;
      const userId = req.user._id;

      // Verify product exists and has stock
      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ message: 'Product not found' });
      if (product.stock <= 0) return res.status(400).json({ message: 'Product is out of stock' });

      const existing = await CartItem.findOne({ userId, productId });
      const requested = (existing ? existing.quantity : 0) + quantity;
      if (requested > product.stock) {
        return res.status(400).json({
          message: `Only ${product.stock} in stock`,
          available: product.stock,
        });
      }

      if (existing) {
        existing.quantity = requested;
        await existing.save();
        const populated = await existing.populate('productId');
        return res.json(populated);
      }

      const item = await CartItem.create({ userId, productId, quantity });
      const populated = await item.populate('productId');
      res.status(201).json(populated);
    } catch (err) {
      next(err);
    }
  }
);

/* ── POST /api/cart/merge — merge a guest (localStorage) cart after login ── */
router.post(
  '/merge',
  [
    body('items').isArray().withMessage('items must be an array'),
    body('items.*.productId').isMongoId().withMessage('Invalid product ID'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const userId = req.user._id;

      for (const { productId, quantity } of req.body.items) {
        const product = await Product.findById(productId);
        if (!product || product.stock <= 0) continue; // skip unknown / sold-out products

        const existing = await CartItem.findOne({ userId, productId });
        const merged = Math.min((existing ? existing.quantity : 0) + quantity, product.stock);

        if (existing) {
          existing.quantity = merged;
          await existing.save();
        } else {
          await CartItem.create({ userId, productId, quantity: merged });
        }
      }

      res.json(await loadCart(userId));
    } catch (err) {
      next(err);
    }
  }
);

/* ── PUT /api/cart/:id — update quantity ── */
router.put(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid cart item ID'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const item = await CartItem.findOneAndUpdate(
        { _id: req.params.id, userId: req.user._id },
        { quantity: req.body.quantity },
        { new: true, runValidators: true }
      ).populate('productId');
      if (!item) return res.status(404).json({ message: 'Cart item not found' });
      res.json(item);
    } catch (err) {
      next(err);
    }
  }
);

/* ── DELETE /api/cart/:id — remove item ── */
router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid cart item ID')],
  validate,
  async (req, res, next) => {
    try {
      const item = await CartItem.findOneAndDelete({
        _id: req.params.id,
        userId: req.user._id,
      });
      if (!item) return res.status(404).json({ message: 'Cart item not found' });
      res.json({ message: 'Item removed from cart' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
