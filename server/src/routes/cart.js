const express = require('express');
const { body, param, validationResult } = require('express-validator');
const CartItem = require('../models/CartItem');
const Product = require('../models/Product');

const router = express.Router();

/* ── Helper: send validation errors ── */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/* ── GET /api/cart — get all cart items (populated) ── */
router.get('/', async (req, res, next) => {
  try {
    const items = await CartItem.find()
      .populate('productId')
      .sort({ addedAt: -1 });

    // Auto-clean stale cart items whose product was deleted or re-seeded
    const staleIds = items.filter(i => !i.productId).map(i => i._id);
    if (staleIds.length > 0) {
      await CartItem.deleteMany({ _id: { $in: staleIds } });
    }

    res.json(items.filter(i => i.productId));
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

      // Verify product exists and has stock
      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ message: 'Product not found' });
      if (product.stock = 0) return res.status(400).json({ message: 'Product is out of stock' });

      // Check if item already in cart
      const existing = await CartItem.findOne({ productId });
      if (existing) {
        existing.quantity += quantity;
        await existing.save();
        const populated = await existing.populate('productId');
        return res.json(populated);
      }

      const item = await CartItem.create({ productId, quantity });
      const populated = await item.populate('productId');
      res.status(201).json(populated);
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
      const item = await CartItem.findByIdAndUpdate(
        req.params.id,
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
      const item = await CartItem.findByIdAndDelete(req.params.id);
      if (!item) return res.status(404).json({ message: 'Cart item not found' });
      res.json({ message: 'Item removed from cart' });
    } catch (err) {
      next(err);
    }
  }
);

/* ── POST /api/cart/checkout — process checkout: deduct stock & clear cart ── */
router.post('/checkout', async (req, res, next) => {
  try {
    const items = await CartItem.find().populate('productId');

    if (items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Remove any cart items whose product no longer exists (stale references)
    const validItems = [];
    const staleIds = [];
    for (const item of items) {
      if (!item.productId) {
        staleIds.push(item._id);
      } else {
        validItems.push(item);
      }
    }
    if (staleIds.length > 0) {
      await CartItem.deleteMany({ _id: { $in: staleIds } });
    }

    if (validItems.length === 0) {
      return res.status(400).json({ message: 'Cart contained only invalid items which have been removed. Please add products again.' });
    }

    // Validate stock for all valid items
    for (const item of validItems) {
      const product = item.productId;
      if (product.stock < item.quantity) {
        return res.status(400).json({
          message: `Not enough stock for "${product.name}". Available: ${product.stock}, requested: ${item.quantity}`,
        });
      }
    }

    // Deduct stock for each item
    for (const item of validItems) {
      await Product.findByIdAndUpdate(item.productId._id, {
        $inc: { stock: -item.quantity },
      });
    }

    // Clear the cart
    await CartItem.deleteMany({});

    res.json({ message: 'Checkout successful' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
