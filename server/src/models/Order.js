const mongoose = require('mongoose');

/* ── Order Schema — items snapshot name/price at purchase time ── */
const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        price: Number,
        imageUrl: String,
        quantity: Number,
      },
    ],
    subtotal: { type: Number, required: true },
    taxRate: { type: Number, required: true },
    tax: { type: Number, required: true },
    total: { type: Number, required: true },
    shippingAddress: {
      fullName: { type: String, required: true },
      line1: { type: String, required: true },
      line2: String,
      city: { type: String, required: true },
      state: { type: String, required: true },
      postcode: { type: String, required: true },
      country: { type: String, default: 'Australia' },
      phone: String,
    },
    payment: {
      method: {
        type: String,
        enum: ['card', 'applepay', 'zip', 'afterpay', 'paypal'],
        required: true,
      },
      status: { type: String, enum: ['paid'], default: 'paid' },
      // Only brand + last4 are ever stored — never the full number or CVC
      cardBrand: String,
      last4: String,
    },
    status: {
      type: String,
      enum: ['processing', 'shipped', 'delivered', 'cancelled'],
      default: 'processing',
    },
    // Entered manually by staff once the parcel is lodged
    trackingNumber: String,
    trackingCarrier: {
      type: String,
      enum: ['auspost', 'cainiao'],
      default: 'auspost',
    },
    // One entry per status the order has passed through, with its timestamp
    statusHistory: [
      {
        _id: false,
        status: {
          type: String,
          enum: ['processing', 'shipped', 'delivered', 'cancelled'],
        },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
