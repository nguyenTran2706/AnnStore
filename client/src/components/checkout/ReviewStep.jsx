import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { detectBrand } from '../../utils/payment';
import ProductImage from '../ProductImage';
import { METHOD_LABELS } from '../../utils/orderStatus';

const REDIRECT_PROVIDERS = { zip: 'Zip', afterpay: 'Afterpay', paypal: 'PayPal' };

export default function ReviewStep({ state, dispatch, totals, items, placeOrder }) {
  const { shipping, payment, submitting, submitError } = state;
  const [sheet, setSheet] = useState(null); // null | 'applepay' | 'redirect'

  const brand = payment.method === 'card' ? detectBrand(payment.card.number) : null;
  const last4 = payment.method === 'card' ? payment.card.number.replace(/\D/g, '').slice(-4) : null;

  const onPlaceOrder = () => {
    if (submitting || sheet) return;
    if (payment.method === 'applepay') setSheet('applepay');
    else if (REDIRECT_PROVIDERS[payment.method]) setSheet('redirect');
    else placeOrder();
  };

  const closeSheet = () => setSheet(null);

  return (
    <div className="card p-6">
      <h2 className="font-heading text-xl text-ink mb-5">Review your order</h2>

      {/* error banner */}
      <AnimatePresence>
        {submitError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto', x: [0, -8, 8, -5, 5, 0] }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ x: { duration: 0.4 } }}
            className="overflow-hidden"
          >
            <div className="bg-danger-light text-danger text-sm rounded-card px-4 py-3 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {submitError}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4 mb-6">
        {/* shipping summary */}
        <div className="rounded-card border border-border p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-ink-faint uppercase tracking-wider mb-1.5">Ship to</p>
              <p className="text-sm text-ink font-medium">{shipping.fullName}</p>
              <p className="text-sm text-ink-light">
                {shipping.line1}
                {shipping.line2 ? `, ${shipping.line2}` : ''}
              </p>
              <p className="text-sm text-ink-light">
                {shipping.city} {shipping.state} {shipping.postcode}, {shipping.country}
              </p>
              {shipping.phone && <p className="text-sm text-ink-faint">{shipping.phone}</p>}
            </div>
            <button
              onClick={() => dispatch({ type: 'GO_TO', step: 'shipping' })}
              className="text-accent hover:text-accent-hover text-xs font-medium"
            >
              Edit
            </button>
          </div>
        </div>

        {/* payment summary */}
        <div className="rounded-card border border-border p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-ink-faint uppercase tracking-wider mb-1.5">Pay with</p>
              <p className="text-sm text-ink font-medium">
                {METHOD_LABELS[payment.method]}
                {last4 && (
                  <span className="text-ink-light font-normal">
                    {' '}
                    — {brand || 'Card'} •••• {last4}
                  </span>
                )}
              </p>
              {(payment.method === 'zip' || payment.method === 'afterpay') && (
                <p className="text-sm text-ink-light">
                  4 × ${(totals.total / 4).toFixed(2)} interest-free
                </p>
              )}
            </div>
            <button
              onClick={() => dispatch({ type: 'GO_TO', step: 'payment' })}
              className="text-accent hover:text-accent-hover text-xs font-medium"
            >
              Edit
            </button>
          </div>
        </div>

        {/* items */}
        <div className="rounded-card border border-border p-4">
          <p className="text-xs font-medium text-ink-faint uppercase tracking-wider mb-3">
            Items ({items.reduce((s, i) => s + i.quantity, 0)})
          </p>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item._id} className="flex items-center gap-3">
                <ProductImage
                  src={item.imageUrl}
                  alt={item.name}
                  padding="p-1"
                  className="w-11 h-11 flex-shrink-0 border border-border/60 !bg-white"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink truncate">{item.name}</p>
                  <p className="text-xs text-ink-faint">Qty {item.quantity} · ${item.price.toFixed(2)} each</p>
                </div>
                <span className="text-sm font-medium text-ink">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-base font-semibold text-ink pt-3 mt-3 border-t border-border">
            <span>Total</span>
            <span>${totals.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={() => dispatch({ type: 'BACK' })} disabled={submitting} className="btn-secondary">
          Back
        </button>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onPlaceOrder}
          disabled={submitting || !!sheet}
          className="btn-primary !px-8 flex items-center gap-2"
        >
          {submitting && !sheet ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing payment...
            </>
          ) : (
            `Place order — $${totals.total.toFixed(2)}`
          )}
        </motion.button>
      </div>

      <AnimatePresence>
        {sheet === 'applepay' && (
          <ApplePaySheet total={totals.total} placeOrder={placeOrder} onClose={closeSheet} />
        )}
        {sheet === 'redirect' && (
          <RedirectModal provider={REDIRECT_PROVIDERS[payment.method]} placeOrder={placeOrder} onClose={closeSheet} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Simulated Apple Pay bottom sheet ── */
function ApplePaySheet({ total, placeOrder, onClose }) {
  const [phase, setPhase] = useState('confirm'); // confirm | processing | done

  const onConfirm = async () => {
    setPhase('processing');
    const res = await placeOrder();
    if (res.ok) {
      setPhase('done'); // brief flash before navigation unmounts us
    } else {
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
    >
      <div className="absolute inset-0 bg-black/50" onClick={phase === 'confirm' ? onClose : undefined} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-6 pb-8 shadow-modal"
      >
        <div className="flex items-center justify-center gap-1.5 mb-5">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 12.54c-.03-2.71 2.21-4.01 2.31-4.07-1.26-1.84-3.22-2.09-3.91-2.12-1.66-.17-3.25.98-4.09.98-.85 0-2.15-.96-3.54-.93-1.82.03-3.5 1.06-4.43 2.69-1.9 3.28-.48 8.12 1.35 10.78.9 1.3 1.97 2.76 3.38 2.71 1.36-.05 1.87-.88 3.52-.88 1.63 0 2.1.88 3.53.85 1.46-.02 2.39-1.32 3.28-2.63 1.03-1.5 1.46-2.97 1.48-3.04-.03-.02-2.84-1.09-2.88-4.34zM14.36 4.6c.74-.9 1.24-2.16 1.11-3.41-1.07.04-2.37.71-3.14 1.61-.69.8-1.29 2.08-1.13 3.3 1.2.09 2.42-.61 3.16-1.5z" />
          </svg>
          <span className="font-semibold text-ink">Pay</span>
        </div>

        <div className="flex justify-between items-center text-sm border-t border-b border-border py-3 mb-6">
          <span className="text-ink-light">Annz Bricks (Demo)</span>
          <span className="font-semibold text-ink">${total.toFixed(2)}</span>
        </div>

        {phase === 'confirm' && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onConfirm}
            className="w-full bg-black text-white rounded-xl py-3.5 font-medium text-sm"
          >
            Confirm with passcode
          </motion.button>
        )}

        {phase === 'processing' && (
          <div className="flex items-center justify-center gap-2 py-3 text-sm text-ink-light">
            <svg className="animate-spin h-5 w-5 text-ink" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processing...
          </div>
        )}

        {phase === 'done' && (
          <div className="flex items-center justify-center gap-2 py-3 text-success">
            <motion.svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <motion.path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </motion.svg>
            <span className="text-sm font-medium">Done</span>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ── Simulated Zip / Afterpay redirect modal ── */
function RedirectModal({ provider, placeOrder, onClose }) {
  const [phase, setPhase] = useState('connecting'); // connecting | approved

  // Cleanup cancels the timers, so a StrictMode effect replay re-arms them
  // and placeOrder still fires exactly once.
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('approved'), 1400);
    const t2 = setTimeout(async () => {
      const res = await placeOrder();
      if (!res.ok) onClose();
    }, 2100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/50" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-white rounded-card w-full max-w-xs p-7 text-center shadow-modal"
      >
        <p className="font-heading text-xl text-ink mb-5">{provider}</p>

        {phase === 'connecting' ? (
          <div className="flex flex-col items-center gap-3 text-sm text-ink-light">
            <svg className="animate-spin h-7 w-7 text-accent" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Redirecting to {provider}... (simulated)
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-success">
            <motion.svg className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <motion.path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </motion.svg>
            <span className="text-sm font-medium">Approved — placing your order...</span>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
