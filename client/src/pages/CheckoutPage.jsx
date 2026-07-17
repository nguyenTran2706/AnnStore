import { useReducer, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as api from '../services/api';
import { useCart } from '../context/CartContext';
import ProductImage from '../components/ProductImage';
import ShippingStep from '../components/checkout/ShippingStep';
import PaymentStep from '../components/checkout/PaymentStep';
import ReviewStep from '../components/checkout/ReviewStep';
import { luhnCheck, validateExpiry, validateCvc } from '../utils/payment';

const STEPS = [
  { key: 'shipping', label: 'Shipping' },
  { key: 'payment', label: 'Payment' },
  { key: 'review', label: 'Review' },
];

const initialState = {
  step: 'shipping',
  direction: 1,
  shipping: {
    fullName: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postcode: '',
    country: 'Australia',
    phone: '',
  },
  payment: {
    method: 'card',
    card: { number: '', expiry: '', cvc: '', name: '' },
  },
  errors: {},
  submitting: false,
  submitError: null,
};

const validateShipping = (shipping) => {
  const errors = {};
  if (!shipping.fullName.trim()) errors.fullName = 'Required';
  if (!shipping.line1.trim()) errors.line1 = 'Required';
  if (!shipping.city.trim()) errors.city = 'Required';
  if (!shipping.state.trim()) errors.state = 'Required';
  // International postcodes vary; matches the server-side rule
  if (!/^[A-Za-z0-9][A-Za-z0-9 -]{1,9}$/.test(shipping.postcode.trim())) {
    errors.postcode = 'Enter a valid postcode';
  }
  if (!shipping.country.trim()) errors.country = 'Required';
  return errors;
};

const validatePayment = (payment) => {
  const errors = {};
  if (payment.method !== 'card') return errors;
  const { card } = payment;
  if (!luhnCheck(card.number)) errors.number = 'Enter a valid card number';
  if (!validateExpiry(card.expiry)) errors.expiry = 'Invalid expiry';
  if (!validateCvc(card.cvc)) errors.cvc = '3–4 digits';
  if (!card.name.trim()) errors.name = 'Required';
  return errors;
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_SHIPPING_FIELD':
      return {
        ...state,
        shipping: { ...state.shipping, [action.field]: action.value },
        errors: { ...state.errors, [action.field]: null },
      };
    case 'SET_CARD_FIELD':
      return {
        ...state,
        payment: { ...state.payment, card: { ...state.payment.card, [action.field]: action.value } },
        errors: { ...state.errors, [action.field]: null },
      };
    case 'SET_METHOD':
      return { ...state, payment: { ...state.payment, method: action.method }, errors: {} };
    case 'NEXT': {
      const errors =
        state.step === 'shipping'
          ? validateShipping(state.shipping)
          : state.step === 'payment'
            ? validatePayment(state.payment)
            : {};
      if (Object.keys(errors).length > 0) return { ...state, errors };
      const idx = STEPS.findIndex((s) => s.key === state.step);
      if (idx >= STEPS.length - 1) return state;
      return { ...state, step: STEPS[idx + 1].key, direction: 1, errors: {}, submitError: null };
    }
    case 'BACK': {
      const idx = STEPS.findIndex((s) => s.key === state.step);
      if (idx <= 0) return state;
      return { ...state, step: STEPS[idx - 1].key, direction: -1, errors: {}, submitError: null };
    }
    case 'GO_TO':
      return { ...state, step: action.step, direction: -1, errors: {}, submitError: null };
    case 'SUBMIT_START':
      return { ...state, submitting: true, submitError: null };
    case 'SUBMIT_FAIL':
      return { ...state, submitting: false, submitError: action.message };
    default:
      return state;
  }
}

const stepVariants = {
  enter: (dir) => ({ x: 40 * dir, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.22, ease: 'easeOut' } },
  exit: (dir) => ({ x: -40 * dir, opacity: 0, transition: { duration: 0.18 } }),
};

export default function CheckoutPage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { items, subtotal, refresh } = useCart();
  const navigate = useNavigate();
  const [taxRate, setTaxRate] = useState(0.1);
  const placedRef = useRef(false);

  useEffect(() => {
    api
      .fetchConfig()
      .then((cfg) => setTaxRate(cfg.taxRate))
      .catch(() => {});
  }, []);

  // Empty cart → nothing to check out (unless we just placed the order)
  useEffect(() => {
    if (items.length === 0 && !placedRef.current) navigate('/', { replace: true });
  }, [items, navigate]);

  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const placeOrder = async () => {
    dispatch({ type: 'SUBMIT_START' });
    try {
      const { method, card } = state.payment;
      const { order } = await api.createOrder({
        shippingAddress: state.shipping,
        payment: {
          method,
          // CVC is deliberately never sent to the server
          card: method === 'card' ? { number: card.number, expiry: card.expiry, name: card.name } : undefined,
        },
      });
      placedRef.current = true;
      await refresh();
      navigate(`/orders/${order._id}/confirmation`, { state: { order } });
      return { ok: true };
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        'Payment failed. Please try again.';
      dispatch({ type: 'SUBMIT_FAIL', message });
      return { ok: false, message };
    }
  };

  const activeIdx = STEPS.findIndex((s) => s.key === state.step);

  return (
    <div className="pt-4 max-w-5xl mx-auto">
      <h1 className="font-heading text-3xl sm:text-4xl text-ink mb-6">Checkout</h1>

      {/* step indicator */}
      <div className="flex items-center gap-6 mb-8 border-b border-border">
        {STEPS.map((s, i) => (
          <div key={s.key} className="relative pb-3">
            <div className={`flex items-center gap-2 text-sm ${i <= activeIdx ? 'text-ink font-medium' : 'text-ink-faint'}`}>
              <span
                className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center transition-colors duration-200 ${
                  i < activeIdx
                    ? 'bg-success text-white'
                    : i === activeIdx
                      ? 'bg-accent text-white'
                      : 'bg-bg-alt text-ink-faint border border-border'
                }`}
              >
                {i < activeIdx ? '✓' : i + 1}
              </span>
              {s.label}
            </div>
            <span
              className={`absolute bottom-0 left-0 right-0 h-0.5 bg-accent transition-opacity duration-200 ${
                i === activeIdx ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
        {/* step panel */}
        <div className="overflow-hidden">
          <AnimatePresence mode="wait" custom={state.direction} initial={false}>
            <motion.div
              key={state.step}
              custom={state.direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {state.step === 'shipping' && <ShippingStep state={state} dispatch={dispatch} />}
              {state.step === 'payment' && <PaymentStep state={state} dispatch={dispatch} total={total} />}
              {state.step === 'review' && (
                <ReviewStep
                  state={state}
                  dispatch={dispatch}
                  totals={{ subtotal, tax, total, taxRate }}
                  items={items}
                  placeOrder={placeOrder}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* order summary */}
        <aside className="card p-5 lg:sticky lg:top-20">
          <h2 className="font-heading text-lg text-ink mb-4">Order summary</h2>
          <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={item._id} className="flex items-center gap-3">
                <ProductImage
                  src={item.imageUrl}
                  alt={item.name}
                  padding="p-1"
                  className="w-12 h-12 flex-shrink-0 border border-border/60 !bg-white"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-ink truncate">{item.name}</p>
                  <p className="text-xs text-ink-faint">Qty {item.quantity}</p>
                </div>
                <span className="text-xs font-medium text-ink">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="space-y-2 pt-3 border-t border-border text-sm">
            <div className="flex justify-between text-ink-light">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-ink-light">
              <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold text-ink pt-2 border-t border-border">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
