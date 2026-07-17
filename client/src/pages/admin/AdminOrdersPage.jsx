import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ProductImage from '../../components/ProductImage';
import { staggerContainer, staggerItem } from '../../components/motion/variants';
import { STATUS_STYLES, METHOD_LABELS, CARRIERS } from '../../utils/orderStatus';

const FILTERS = ['all', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrdersPage() {
  const { addToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [trackingEditId, setTrackingEditId] = useState(null);
  const [trackingValue, setTrackingValue] = useState('');
  const [trackingCarrier, setTrackingCarrier] = useState('auspost');
  const [savingTracking, setSavingTracking] = useState(false);

  useEffect(() => {
    api
      .fetchAdminOrders()
      .then(setOrders)
      .catch(() => addToast('Failed to load orders', 'error'))
      .finally(() => setLoading(false));
  }, [addToast]);

  const counts = useMemo(() => {
    const c = { all: orders.length };
    for (const f of FILTERS.slice(1)) c[f] = orders.filter((o) => o.status === f).length;
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      const matchSearch =
        !q ||
        o.orderNumber.toLowerCase().includes(q) ||
        (o.userId?.name || '').toLowerCase().includes(q) ||
        (o.userId?.email || '').toLowerCase().includes(q) ||
        (o.shippingAddress?.country || '').toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [orders, statusFilter, search]);

  const changeStatus = async (order, status) => {
    setUpdatingId(order._id);
    try {
      const updated = await api.updateOrderStatus(order._id, status);
      setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
      addToast(status === 'cancelled' ? 'Order cancelled — stock restored' : `Order marked ${status}`);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update order', 'error');
    } finally {
      setUpdatingId(null);
      setConfirmCancelId(null);
    }
  };

  const onCancel = (order) => {
    if (confirmCancelId === order._id) {
      changeStatus(order, 'cancelled');
    } else {
      setConfirmCancelId(order._id);
      setTimeout(() => setConfirmCancelId((id) => (id === order._id ? null : id)), 3000);
    }
  };

  const openTrackingEdit = (order) => {
    setTrackingEditId(order._id);
    setTrackingValue(order.trackingNumber || '');
    setTrackingCarrier(order.trackingCarrier || 'auspost');
  };

  const cancelTrackingEdit = () => {
    setTrackingEditId(null);
    setTrackingValue('');
  };

  const saveTracking = async (order) => {
    const value = trackingValue.trim();
    if (!/^[A-Za-z0-9]{6,40}$/.test(value)) {
      addToast('Tracking number must be 6–40 letters/digits', 'error');
      return;
    }
    setSavingTracking(true);
    try {
      const updated = await api.updateOrderTracking(order._id, value, trackingCarrier);
      setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
      addToast('Tracking number saved');
      cancelTrackingEdit();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save tracking number', 'error');
    } finally {
      setSavingTracking(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 bg-bg-alt rounded animate-pulse" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card h-20 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <section>
      <h1 className="font-heading text-3xl text-ink mb-1">Orders</h1>
      <p className="text-ink-light text-sm mb-5">All customer orders, newest first</p>

      {/* filters + search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-card text-xs font-medium capitalize transition-all duration-200 ${
                statusFilter === f
                  ? 'bg-ink text-white scale-105'
                  : 'bg-bg-alt text-ink-light hover:text-ink border border-border'
              }`}
            >
              {f} ({counts[f]})
            </button>
          ))}
        </div>

        <div className="relative sm:ml-auto">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-faint pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Order # or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field !pl-9 !py-2 sm:w-64 text-sm"
            aria-label="Search orders"
          />
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-ink-light">No orders yet.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-ink-light mb-3">No orders match your filters.</p>
          <button
            onClick={() => { setStatusFilter('all'); setSearch(''); }}
            className="btn-secondary text-xs"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="enter" className="space-y-3">
          {filtered.map((order) => {
            const expanded = expandedId === order._id;
            const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
            const busy = updatingId === order._id;

            return (
              <motion.div key={order._id} variants={staggerItem} className="card overflow-hidden">
                <button
                  onClick={() => setExpandedId(expanded ? null : order._id)}
                  className="w-full text-left p-4 hover:bg-bg-alt/30 transition-colors"
                  aria-expanded={expanded}
                >
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="min-w-[130px]">
                      <p className="font-mono text-sm text-ink font-medium">{order.orderNumber}</p>
                      <p className="text-xs text-ink-faint mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString(undefined, {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                        {' · '}{itemCount} item{itemCount !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <div className="flex-1 min-w-[140px]">
                      <p className="text-sm font-medium text-ink truncate">{order.userId?.name ?? 'Unknown customer'}</p>
                      <p className="text-xs text-ink-faint truncate">{order.userId?.email ?? '—'}</p>
                    </div>

                    <span className={`badge capitalize ${STATUS_STYLES[order.status] || 'bg-bg-alt text-ink-light'}`}>
                      {order.status}
                    </span>

                    <span className="text-sm font-semibold text-ink tabular-nums w-20 text-right">
                      ${order.total.toFixed(2)}
                    </span>

                    <motion.svg
                      animate={{ rotate: expanded ? 180 : 0 }}
                      className="w-4 h-4 text-ink-faint"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
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
                      <div className="px-4 pb-4 pt-1 border-t border-border/60">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div>
                            <p className="text-xs font-medium text-ink-faint uppercase tracking-wider mb-2 mt-3">Items</p>
                            <div className="space-y-2.5">
                              {order.items.map((item, i) => (
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
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="text-sm">
                            <p className="text-xs font-medium text-ink-faint uppercase tracking-wider mb-2 mt-3">Details</p>
                            <p className="text-ink font-medium">{order.shippingAddress.fullName}</p>
                            <p className="text-ink-light text-xs leading-relaxed">
                              {order.shippingAddress.line1}
                              {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}
                              <br />
                              {order.shippingAddress.city} {order.shippingAddress.state} {order.shippingAddress.postcode}
                              <br />
                              <span className={order.shippingAddress.country !== 'Australia' ? 'font-medium text-ink' : ''}>
                                {order.shippingAddress.country || 'Australia'}
                              </span>
                            </p>
                            <p className="text-ink-light text-xs mt-2">
                              Paid with {METHOD_LABELS[order.payment.method]}
                              {order.payment.last4 ? ` — ${order.payment.cardBrand} •••• ${order.payment.last4}` : ''}
                            </p>
                            {/* tracking number — entered manually by staff (AusPost) */}
                            <div className="mt-2">
                              {trackingEditId === order._id ? (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <select
                                    value={trackingCarrier}
                                    onChange={(e) => setTrackingCarrier(e.target.value)}
                                    className="input-field !w-36 !px-2 !py-1 text-xs"
                                    aria-label="Carrier"
                                  >
                                    {Object.entries(CARRIERS).map(([key, c]) => (
                                      <option key={key} value={key}>
                                        {c.label}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    type="text"
                                    value={trackingValue}
                                    onChange={(e) => setTrackingValue(e.target.value.toUpperCase())}
                                    placeholder="Tracking number"
                                    className="input-field !w-52 !px-2 !py-1 text-xs font-mono"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveTracking(order);
                                      if (e.key === 'Escape') cancelTrackingEdit();
                                    }}
                                  />
                                  <button
                                    onClick={() => saveTracking(order)}
                                    disabled={savingTracking}
                                    className="btn-primary !px-2.5 !py-1 text-xs"
                                  >
                                    {savingTracking ? 'Saving...' : 'Save'}
                                  </button>
                                  <button onClick={cancelTrackingEdit} className="btn-ghost !px-2 !py-1 text-xs">
                                    Cancel
                                  </button>
                                </div>
                              ) : order.trackingNumber ? (
                                <p className="text-ink-light text-xs flex items-center gap-1.5">
                                  Tracking: <span className="font-mono text-ink">{order.trackingNumber}</span>
                                  <span className="text-ink-faint">
                                    · {(CARRIERS[order.trackingCarrier] || CARRIERS.auspost).label}
                                  </span>
                                  {(order.status === 'processing' || order.status === 'shipped') && (
                                    <button
                                      onClick={() => openTrackingEdit(order)}
                                      className="text-accent hover:text-accent-hover font-medium"
                                    >
                                      Edit
                                    </button>
                                  )}
                                </p>
                              ) : order.status === 'processing' || order.status === 'shipped' ? (
                                <button
                                  onClick={() => openTrackingEdit(order)}
                                  className="btn-ghost !px-2.5 !py-1 text-xs flex items-center gap-1"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                  </svg>
                                  Add tracking number
                                </button>
                              ) : null}
                            </div>
                            <div className="mt-3 pt-2 border-t border-border/60 space-y-1 text-xs text-ink-light">
                              <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span className="tabular-nums">${order.subtotal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Tax</span>
                                <span className="tabular-nums">${order.tax.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between font-semibold text-ink text-sm pt-1">
                                <span>Total</span>
                                <span className="tabular-nums">${order.total.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* actions */}
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/60">
                          {order.status === 'processing' ? (
                            <>
                              <button
                                onClick={() => changeStatus(order, 'shipped')}
                                disabled={busy}
                                className="btn-secondary !py-1.5 text-xs flex items-center gap-1.5"
                              >
                                {busy && (
                                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                )}
                                Mark shipped
                              </button>
                              <button
                                onClick={() => onCancel(order)}
                                disabled={busy}
                                className={`text-xs px-3 py-1.5 rounded-card transition-all duration-150 ${
                                  confirmCancelId === order._id
                                    ? 'bg-danger text-white'
                                    : 'text-ink-faint hover:text-danger hover:bg-danger-light'
                                }`}
                              >
                                {confirmCancelId === order._id ? 'Confirm cancel' : 'Cancel order'}
                              </button>
                            </>
                          ) : order.status === 'shipped' ? (
                            <button
                              onClick={() => changeStatus(order, 'delivered')}
                              disabled={busy}
                              className="btn-secondary !py-1.5 text-xs flex items-center gap-1.5"
                            >
                              {busy && (
                                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                              )}
                              Mark delivered
                            </button>
                          ) : (
                            <p className="text-xs text-ink-faint">No actions available</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </section>
  );
}
