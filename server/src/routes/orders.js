const express = require('express');
const { body, param, validationResult } = require('express-validator');
const CartItem = require('../models/CartItem');
const Product = require('../models/Product');
const Order = require('../models/Order');
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

/* ── Simulated payment config ── */
const DECLINE_CARD = '4000000000000002';

const detectBrand = (digits) => {
  if (/^4/.test(digits)) return 'Visa';
  if (/^5[1-5]/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  return 'Card';
};

const makeOrderNumber = () => {
  const rand = Array.from({ length: 2 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join('');
  return 'AB-' + Date.now().toString(36).toUpperCase() + rand;
};

const addressRules = [
  body('shippingAddress.fullName').trim().notEmpty().withMessage('Full name is required'),
  body('shippingAddress.line1').trim().notEmpty().withMessage('Address line 1 is required'),
  body('shippingAddress.city').trim().notEmpty().withMessage('City is required'),
  body('shippingAddress.state').trim().notEmpty().withMessage('State is required'),
  // International postcodes vary (AU 4 digits, UK alphanumeric, ...)
  body('shippingAddress.postcode')
    .trim()
    .matches(/^[A-Za-z0-9][A-Za-z0-9 -]{1,9}$/)
    .withMessage('Enter a valid postcode'),
  body('shippingAddress.country').trim().notEmpty().withMessage('Country is required'),
  body('payment.method')
    .isIn(['card', 'applepay', 'zip', 'afterpay', 'paypal'])
    .withMessage('Invalid payment method'),
];

/* ── POST /api/orders — place order (simulated payment) ── */
router.post('/', addressRules, validate, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { shippingAddress, payment } = req.body;

    const items = await CartItem.find({ userId }).populate('productId');
    const validItems = items.filter((i) => i.productId);
    if (validItems.length === 0) {
      return res.status(400).json({ message: 'Your cart is empty' });
    }

    if (payment.method === 'card' && !payment.card?.number) {
      return res.status(400).json({ message: 'Card details are required' });
    }

    // Simulate payment processing latency
    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 600));

    let cardBrand;
    let last4;
    if (payment.method === 'card') {
      const digits = String(payment.card.number).replace(/\D/g, '');
      if (digits === DECLINE_CARD) {
        return res.status(402).json({ message: 'Your card was declined.', code: 'card_declined' });
      }
      cardBrand = detectBrand(digits);
      last4 = digits.slice(-4);
    }

    // Atomically decrement stock per item; roll back on any shortage.
    // Best-effort rollback, not transactional — acceptable at this scale.
    const decremented = [];
    for (const item of validItems) {
      const updated = await Product.findOneAndUpdate(
        { _id: item.productId._id, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } }
      );
      if (!updated) {
        for (const done of decremented) {
          await Product.findByIdAndUpdate(done.productId, { $inc: { stock: done.quantity } });
        }
        return res.status(409).json({
          message: `Not enough stock for "${item.productId.name}"`,
        });
      }
      decremented.push({ productId: item.productId._id, quantity: item.quantity });
    }

    const taxRate = Number(process.env.TAX_RATE ?? 0.1);
    const subtotal = validItems.reduce((sum, i) => sum + i.productId.price * i.quantity, 0);
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    const order = await Order.create({
      orderNumber: makeOrderNumber(),
      userId,
      items: validItems.map((i) => ({
        productId: i.productId._id,
        name: i.productId.name,
        price: i.productId.price,
        imageUrl: i.productId.imageUrl,
        quantity: i.quantity,
      })),
      subtotal: Math.round(subtotal * 100) / 100,
      taxRate,
      tax,
      total,
      shippingAddress,
      payment: { method: payment.method, status: 'paid', cardBrand, last4 },
      statusHistory: [{ status: 'processing', at: new Date() }],
    });

    await CartItem.deleteMany({ userId });

    res.status(201).json({ order });
  } catch (err) {
    next(err);
  }
});

/* ── GET /api/orders — current user's orders, newest first ── */
router.get('/', async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

/* ── GET /api/orders/:id — single order (own, or any if admin) ── */
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid order ID')],
  validate,
  async (req, res, next) => {
    try {
      const query = { _id: req.params.id };
      if (req.user.role !== 'admin') query.userId = req.user._id;
      const order = await Order.findOne(query);
      if (!order) return res.status(404).json({ message: 'Order not found' });
      res.json(order);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
