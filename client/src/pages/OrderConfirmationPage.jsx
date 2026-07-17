import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as api from '../services/api';
import ProductImage from '../components/ProductImage';
import OrderTimeline from '../components/OrderTimeline';
import { METHOD_LABELS } from '../utils/orderStatus';

const revealStagger = {
  initial: {},
  enter: { transition: { staggerChildren: 0.08, delayChildren: 0.5 } },
};

const revealItem = {
  initial: { opacity: 0, y: 12 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export default function OrderConfirmationPage() {
  const { id } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!location.state?.order);
  const [error, setError] = useState(false);
  const [googleUrl, setGoogleUrl] = useState(null);

  useEffect(() => {
    api.fetchConfig().then((c) => setGoogleUrl(c.googleReviewUrl)).catch(() => {});
  }, []);

  useEffect(() => {
    if (order) return;
    api
      .fetchOrder(id)
      .then(setOrder)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <svg className="animate-spin h-6 w-6 text-accent" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h1 className="font-heading text-2xl text-ink mb-2">Order not found</h1>
        <Link to="/orders" className="btn-primary mt-4">
          View my orders
        </Link>
      </div>
    );
  }

  const { shippingAddress: addr, payment } = order;

  return (
    <div className="max-w-lg mx-auto pt-6">
      <div className="card p-7 sm:p-9 text-center">
        {/* animated checkmark */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          className="w-16 h-16 rounded-full bg-success/10 border-2 border-success flex items-center justify-center mx-auto mb-5"
        >
          <motion.svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <motion.path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
            />
          </motion.svg>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h1 className="font-heading text-3xl text-ink mb-2">Order placed!</h1>
          <p className="text-ink-light text-sm mb-3">
            Thank you for shopping with Annz Bricks. A confirmation is on its way.
          </p>
          <span className="inline-block font-mono text-sm bg-bg-alt border border-border rounded-card px-3 py-1 text-ink mb-6">
            {order.orderNumber}
          </span>
        </motion.div>

        <motion.div variants={revealStagger} initial="initial" animate="enter" className="text-left space-y-4">
          {/* items */}
          <motion.div variants={revealItem} className="rounded-card border border-border p-4">
            <p className="text-xs font-medium text-ink-faint uppercase tracking-wider mb-3">Items</p>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.productId || item._id} className="flex items-center gap-3">
                  <ProductImage
                    src={item.imageUrl}
                    alt={item.name}
                    padding="p-1"
                    className="w-11 h-11 flex-shrink-0 border border-border/60 !bg-white"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink truncate">{item.name}</p>
                    <p className="text-xs text-ink-faint">Qty {item.quantity}</p>
                  </div>
                  <span className="text-sm font-medium text-ink">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* totals */}
          <motion.div variants={revealItem} className="rounded-card border border-border p-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-ink-light">
              <span>Subtotal</span>
              <span>${order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-ink-light">
              <span>Tax ({(order.taxRate * 100).toFixed(0)}%)</span>
              <span>${order.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-ink pt-2 border-t border-border">
              <span>Total</span>
              <span>${order.total.toFixed(2)}</span>
            </div>
          </motion.div>

          {/* delivery timeline */}
          <motion.div variants={revealItem} className="rounded-card border border-border p-4">
            <p className="text-xs font-medium text-ink-faint uppercase tracking-wider mb-3">Delivery</p>
            <OrderTimeline order={order} />
            <p className="text-xs text-ink-faint mt-3">
              You can follow your delivery any time from <span className="font-medium text-ink-light">My orders</span> —
              a tracking number appears here as soon as your order ships.
            </p>
          </motion.div>

          {/* shipping + payment */}
          <motion.div variants={revealItem} className="rounded-card border border-border p-4 text-sm">
            <p className="text-xs font-medium text-ink-faint uppercase tracking-wider mb-1.5">Ship to</p>
            <p className="text-ink font-medium">{addr.fullName}</p>
            <p className="text-ink-light">
              {addr.line1}
              {addr.line2 ? `, ${addr.line2}` : ''}, {addr.city} {addr.state} {addr.postcode},{' '}
              {addr.country || 'Australia'}
            </p>
            <p className="text-xs font-medium text-ink-faint uppercase tracking-wider mt-3 mb-1.5">Paid with</p>
            <p className="text-ink-light">
              {METHOD_LABELS[payment.method]}
              {payment.last4 ? ` — ${payment.cardBrand} •••• ${payment.last4}` : ''}
            </p>
          </motion.div>

          <motion.div variants={revealItem} className="flex gap-3 pt-2">
            <Link to="/" className="btn-secondary flex-1 text-center">
              Continue shopping
            </Link>
            <Link to="/orders" className="btn-primary flex-1 text-center">
              View my orders
            </Link>
          </motion.div>

          {googleUrl && (
            <motion.div variants={revealItem} className="rounded-card bg-bg-alt/60 border border-border p-4 text-center">
              <p className="text-sm text-ink font-medium mb-1">Enjoying Annz Bricks?</p>
              <p className="text-xs text-ink-light mb-3">
                A quick Google review helps other collectors find the store.
              </p>
              <a
                href={googleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary inline-flex items-center gap-2 !py-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Review us on Google
              </a>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
