const mongoose = require('mongoose');

/* ── Review Schema — one review per product per delivered order ── */
const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
      default: '',
    },
    // Customer photo URLs under /uploads/reviews/
    images: [String],
    // Admin response, shown publicly under the review
    reply: {
      text: { type: String, trim: true, maxlength: 1000 },
      at: Date,
    },
  },
  { timestamps: true }
);

reviewSchema.index({ orderId: 1, productId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
