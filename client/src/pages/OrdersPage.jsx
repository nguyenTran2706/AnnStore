import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as api from '../services/api';
import ProductImage from '../components/ProductImage';
import OrderTimeline from '../components/OrderTimeline';
import ReviewModal from '../components/ReviewModal';
import { staggerContainer, staggerItem } from '../components/motion/variants';
import { STATUS_STYLES, METHOD_LABELS } from '../utils/orderStatus';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [reviewedKeys, setReviewedKeys] = useState(new Set());
  const [reviewTarget, setReviewTarget] = useState(null); // { order, item }

  const loadMyReviews = () =>
    api
      .fetchMyReviews()
      .then((mine) => setReviewedKeys(new Set(mine.map((r) => `${r.orderId}:${r.productId}`))))
      .catch(() => {});

  useEffect(() => {
    api
      .fetchOrders()
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoading(false));
    loadMyReviews();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 pt-8 max-w-3xl mx-auto">
        <div className="h-8 w-40 bg-bg-alt rounded animate-pulse" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <svg className="w-12 h-12 text-ink-faint/40 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
        <h1 className="font-heading text-2xl text-ink mb-2">No orders yet</h1>
        <p className="text-ink-light max-w-sm mb-6">
          When you place an order, it will show up here.
        </p>
        <Link to="/" className="btn-primary">
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pt-4">
      <h1 className="font-heading text-3xl sm:text-4xl text-ink mb-6">My orders</h1>

      <motion.div variants={staggerContainer} initial="initial" animate="enter" className="space-y-4">
        {orders.map((order) => {
          const expanded = expandedId === order._id;
          const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);

          return (
            <motion.div key={order._id} variants={staggerItem} className="card overflow-hidden">
              <button
                onClick={() => setExpandedId(expanded ? null : order._id)}
                className="w-full text-left p-4 sm:p-5 hover:bg-bg-alt/30 transition-colors"
                aria-expanded={expanded}
              >
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="flex-1 min-w-[140px]">
                    <p className="font-mono text-sm text-ink font-medium">{order.orderNumber}</p>
                    <p className="text-xs text-ink-faint mt-0.5">
                      {new Date(order.createdAt).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {' · '}
                      {itemCount} item{itemCount !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* overlapping thumbnails */}
                  <div className="flex -space-x-3">
                    {order.items.slice(0, 3).map((item, i) => (
                      <ProductImage
                        key={i}
                        src={item.imageUrl}
                        alt={item.name}
                        padding="p-0.5"
                        className="w-9 h-9 !bg-white border border-border ring-2 ring-white"
                      />
                    ))}
                    {order.items.length > 3 && (
                      <span className="w-9 h-9 rounded-card bg-bg-alt border border-border ring-2 ring-white flex items-center justify-center text-[10px] font-medium text-ink-light">
                        +{order.items.length - 3}
                      </span>
                    )}
                  </div>

                  <span className={`badge capitalize ${STATUS_STYLES[order.status] || 'bg-bg-alt text-ink-light'}`}>
                    {order.status}
                  </span>

                  <span className="text-sm font-semibold text-ink w-20 text-right">
                    ${order.total.toFixed(2)}
                  </span>

                  <motion.svg
                    animate={{ rotate: expanded ? 180 : 0 }}
                    className="w-4 h-4 text-ink-faint"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </motion.svg>
                </div>
              </button>

              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <p className="text-xs font-medium text-ink-faint uppercase tracking-wider mb-2 mt-3">Items</p>
                        <div className="space-y-2.5">
                          {order.items.map((item, i) => {
                            const reviewed = reviewedKeys.has(`${order._id}:${item.productId}`);
                            return (
                              <div key={i} className="flex items-center gap-3">
                                <ProductImage
                                  src={item.imageUrl}
                                  alt={item.name}
                                  padding="p-1"
                                  className="w-10 h-10 flex-shrink-0 !bg-white border border-border/60"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-ink truncate">{item.name}</p>
                                  <p className="text-[11px] text-ink-faint">
                                    Qty {item.quantity} · ${item.price.toFixed(2)}
                                  </p>
                                </div>
                                {order.status === 'delivered' &&
                                  (reviewed ? (
                                    <span className="text-[11px] text-success font-medium flex items-center gap-1 flex-shrink-0">
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                      </svg>
                                      Reviewed
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => setReviewTarget({ order, item })}
                                      className="btn-secondary !px-2.5 !py-1 text-[11px] flex-shrink-0"
                                    >
                                      Write a review
                                    </button>
                                  ))}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="text-sm">
                        <p className="text-xs font-medium text-ink-faint uppercase tracking-wider mb-2 mt-3">Details</p>
                        <p className="text-ink font-medium">{order.shippingAddress.fullName}</p>
                        <p className="text-ink-light text-xs leading-relaxed">
                          {order.shippingAddress.line1}
                          {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}
                          <br />
                          {order.shippingAddress.city} {order.shippingAddress.state}{' '}
                          {order.shippingAddress.postcode}
                          <br />
                          {order.shippingAddress.country || 'Australia'}
                        </p>
                        <p className="text-ink-light text-xs mt-2">
                          Paid with {METHOD_LABELS[order.payment.method]}
                          {order.payment.last4 ? ` — ${order.payment.cardBrand} •••• ${order.payment.last4}` : ''}
                        </p>
                        <div className="mt-3 pt-2 border-t border-border/60 space-y-1 text-xs text-ink-light">
                          <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>${order.subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tax</span>
                            <span>${order.tax.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-semibold text-ink text-sm pt-1">
                            <span>Total</span>
                            <span>${order.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <p className="text-xs font-medium text-ink-faint uppercase tracking-wider mb-3">Delivery</p>
                        <OrderTimeline order={order} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>

      {reviewTarget && (
        <ReviewModal
          order={reviewTarget.order}
          item={reviewTarget.item}
          onClose={() => setReviewTarget(null)}
          onSubmitted={loadMyReviews}
        />
      )}
    </div>
  );
}
