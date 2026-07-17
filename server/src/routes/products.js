const express = require('express');
const { body, param, validationResult } = require('express-validator');
const Product = require('../models/Product');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

/* ── Helper: send validation errors ── */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/* ── Shared validation rules ── */
const productRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('imageUrl').trim().notEmpty().withMessage('Image URL is required'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
];

/* ── GET /api/products — list all products ── */
router.get('/', async (req, res, next) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    next(err);
  }
});

/* ── GET /api/products/:id — single product ── */
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid product ID')],
  validate,
  async (req, res, next) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ message: 'Product not found' });
      res.json(product);
    } catch (err) {
      next(err);
    }
  }
);

/* ── POST /api/products — create a product (admin only) ── */
router.post('/', requireAdmin, productRules, validate, async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

/* ── PUT /api/products/:id — update a product (admin only) ── */
router.put(
  '/:id',
  requireAdmin,
  [param('id').isMongoId().withMessage('Invalid product ID'), ...productRules],
  validate,
  async (req, res, next) => {
    try {
      const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!product) return res.status(404).json({ message: 'Product not found' });
      res.json(product);
    } catch (err) {
      next(err);
    }
  }
);

/* ── DELETE /api/products/:id — delete a product (admin only) ── */
router.delete(
  '/:id',
  requireAdmin,
  [param('id').isMongoId().withMessage('Invalid product ID')],
  validate,
  async (req, res, next) => {
    try {
      const product = await Product.findByIdAndDelete(req.params.id);
      if (!product) return res.status(404).json({ message: 'Product not found' });
      res.json({ message: 'Product deleted' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
