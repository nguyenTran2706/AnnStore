import { motion } from 'framer-motion';
import { formatCardNumber, formatExpiry, detectBrand } from '../../utils/payment';

const METHODS = [
  { key: 'card', label: 'Card', sub: 'Powered by Stripe' },
  { key: 'paypal', label: 'PayPal', sub: 'Worldwide' },
  { key: 'applepay', label: 'Apple Pay', sub: 'Fast & secure' },
  { key: 'zip', label: 'Zip', sub: 'Own it now, pay later' },
  { key: 'afterpay', label: 'Afterpay', sub: '4 interest-free payments' },
];

function MethodIcon({ method }) {
  switch (method) {
    case 'card':
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
        </svg>
      );
    case 'applepay':
      return (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.05 12.54c-.03-2.71 2.21-4.01 2.31-4.07-1.26-1.84-3.22-2.09-3.91-2.12-1.66-.17-3.25.98-4.09.98-.85 0-2.15-.96-3.54-.93-1.82.03-3.5 1.06-4.43 2.69-1.9 3.28-.48 8.12 1.35 10.78.9 1.3 1.97 2.76 3.38 2.71 1.36-.05 1.87-.88 3.52-.88 1.63 0 2.1.88 3.53.85 1.46-.02 2.39-1.32 3.28-2.63 1.03-1.5 1.46-2.97 1.48-3.04-.03-.02-2.84-1.09-2.88-4.34zM14.36 4.6c.74-.9 1.24-2.16 1.11-3.41-1.07.04-2.37.71-3.14 1.61-.69.8-1.29 2.08-1.13 3.3 1.2.09 2.42-.61 3.16-1.5z" />
        </svg>
      );
    case 'paypal':
      return (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 00-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 00-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 00.554.647h3.882c.46 0 .85-.334.922-.788l.04-.207.73-4.625.047-.256a.93.93 0 01.922-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.473z" />
        </svg>
      );
    case 'zip':
      return <span className="font-black text-lg tracking-tight">Zip</span>;
    case 'afterpay':
      return <span className="font-black text-sm tracking-tight">afterpay</span>;
    default:
      return null;
  }
}

export default function PaymentStep({ state, dispatch, total }) {
  const { payment, errors } = state;
  const { method, card } = payment;
  const brand = detectBrand(card.number);
  const installment = (total / 4).toFixed(2);

  const onNext = (e) => {
    e.preventDefault();
    dispatch({ type: 'NEXT' });
  };

  return (
    <form onSubmit={onNext} className="card p-6">
      <h2 className="font-heading text-xl text-ink mb-5">Payment method</h2>

      {/* method selector */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {METHODS.map((m) => {
          const selected = method === m.key;
          return (
            <motion.button
              key={m.key}
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => dispatch({ type: 'SET_METHOD', method: m.key })}
              className={`relative rounded-card p-4 text-left transition-all duration-200 border-2 ${
                selected
                  ? 'bg-accent-light border-accent shadow-card'
                  : 'border-border bg-white hover:border-border-hover'
              }`}
              aria-pressed={selected}
            >
              <div className={`mb-2 transition-colors duration-200 ${selected ? 'text-accent' : 'text-ink-light'}`}>
                <MethodIcon method={m.key} />
              </div>
              <p className="text-sm font-medium text-ink">{m.label}</p>
              <p className="text-xs text-ink-faint">{m.sub}</p>
            </motion.button>
          );
        })}
      </div>

      {/* method detail */}
      {method === 'card' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-light mb-1" htmlFor="card-number">
              Card number
            </label>
            <div className="relative">
              <input
                id="card-number"
                type="text"
                value={card.number}
                onChange={(e) =>
                  dispatch({ type: 'SET_CARD_FIELD', field: 'number', value: formatCardNumber(e.target.value) })
                }
                placeholder="4242 4242 4242 4242"
                inputMode="numeric"
                autoComplete="cc-number"
                className={`input-field pr-20 ${errors.number ? '!border-danger' : ''}`}
              />
              {brand && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-light">
                  {brand}
                </span>
              )}
            </div>
            {errors.number && <p className="text-danger text-xs mt-0.5">{errors.number}</p>}
            <p className="text-ink-faint text-xs mt-1">
              Card payments are processed via Stripe. Demo store — try 4242 4242 4242 4242, or 4000 0000 0000 0002 to see a decline.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-light mb-1" htmlFor="card-expiry">
                Expiry
              </label>
              <input
                id="card-expiry"
                type="text"
                value={card.expiry}
                onChange={(e) =>
                  dispatch({ type: 'SET_CARD_FIELD', field: 'expiry', value: formatExpiry(e.target.value) })
                }
                placeholder="MM/YY"
                inputMode="numeric"
                autoComplete="cc-exp"
                className={`input-field ${errors.expiry ? '!border-danger' : ''}`}
              />
              {errors.expiry && <p className="text-danger text-xs mt-0.5">{errors.expiry}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-light mb-1" htmlFor="card-cvc">
                CVC
              </label>
              <input
                id="card-cvc"
                type="password"
                value={card.cvc}
                onChange={(e) =>
                  dispatch({ type: 'SET_CARD_FIELD', field: 'cvc', value: e.target.value.replace(/\D/g, '').slice(0, 4) })
                }
                placeholder="123"
                inputMode="numeric"
                autoComplete="cc-csc"
                className={`input-field ${errors.cvc ? '!border-danger' : ''}`}
              />
              {errors.cvc && <p className="text-danger text-xs mt-0.5">{errors.cvc}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-light mb-1" htmlFor="card-name">
              Name on card
            </label>
            <input
              id="card-name"
              type="text"
              value={card.name}
              onChange={(e) => dispatch({ type: 'SET_CARD_FIELD', field: 'name', value: e.target.value })}
              placeholder="Jane Citizen"
              autoComplete="cc-name"
              className={`input-field ${errors.name ? '!border-danger' : ''}`}
            />
            {errors.name && <p className="text-danger text-xs mt-0.5">{errors.name}</p>}
          </div>
        </div>
      )}

      {method === 'applepay' && (
        <div className="rounded-card bg-bg-alt/60 border border-border p-5 text-center">
          <div className="inline-flex items-center gap-1.5 bg-black text-white rounded-lg px-6 py-2.5 mb-3">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 12.54c-.03-2.71 2.21-4.01 2.31-4.07-1.26-1.84-3.22-2.09-3.91-2.12-1.66-.17-3.25.98-4.09.98-.85 0-2.15-.96-3.54-.93-1.82.03-3.5 1.06-4.43 2.69-1.9 3.28-.48 8.12 1.35 10.78.9 1.3 1.97 2.76 3.38 2.71 1.36-.05 1.87-.88 3.52-.88 1.63 0 2.1.88 3.53.85 1.46-.02 2.39-1.32 3.28-2.63 1.03-1.5 1.46-2.97 1.48-3.04-.03-.02-2.84-1.09-2.88-4.34zM14.36 4.6c.74-.9 1.24-2.16 1.11-3.41-1.07.04-2.37.71-3.14 1.61-.69.8-1.29 2.08-1.13 3.3 1.2.09 2.42-.61 3.16-1.5z" />
            </svg>
            <span className="font-semibold">Pay</span>
          </div>
          <p className="text-sm text-ink-light">
            You'll confirm your payment of <span className="font-semibold text-ink">${total.toFixed(2)}</span> with
            Apple Pay at the final step.
          </p>
        </div>
      )}

      {method === 'paypal' && (
        <div className="rounded-card bg-bg-alt/60 border border-border p-5">
          <p className="font-medium text-ink text-sm mb-1">PayPal</p>
          <p className="text-sm text-ink-light">
            Pay <span className="font-semibold text-ink">${total.toFixed(2)}</span> with your PayPal balance or
            linked cards — ideal for international customers. You'll be redirected to PayPal to approve the
            purchase (simulated).
          </p>
        </div>
      )}

      {(method === 'zip' || method === 'afterpay') && (
        <div className="rounded-card bg-bg-alt/60 border border-border p-5">
          <p className="font-medium text-ink text-sm mb-1">
            {method === 'zip' ? 'Zip — own it now, pay later' : 'Afterpay'}
          </p>
          <p className="text-sm text-ink-light">
            4 interest-free payments of <span className="font-semibold text-ink">${installment}</span>. You'll be
            redirected to {method === 'zip' ? 'Zip' : 'Afterpay'} to approve the purchase (simulated).
          </p>
        </div>
      )}

      <div className="flex justify-between mt-6">
        <button type="button" onClick={() => dispatch({ type: 'BACK' })} className="btn-secondary">
          Back
        </button>
        <button type="submit" className="btn-primary !px-8">
          Review order
        </button>
      </div>
    </form>
  );
}
