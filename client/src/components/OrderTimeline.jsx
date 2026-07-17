import { motion } from 'framer-motion';
import { useToast } from '../context/ToastContext';
import { CARRIERS } from '../utils/orderStatus';

/* Vertical delivery stepper: Order placed → Shipped → Delivered, or a
   Cancelled branch. Dates come from order.statusHistory; orders created
   before tracking existed fall back to createdAt / updatedAt. */

const fmtDate = (d) =>
  new Date(d).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const PHASES = [
  {
    key: 'processing',
    title: 'Order placed',
    doneText: 'Payment received — we are packing your bricks.',
  },
  {
    key: 'shipped',
    title: 'Shipped',
    doneText: 'Your parcel is on its way.',
    todoText: 'Waiting to be dispatched.',
  },
  {
    key: 'delivered',
    title: 'Delivered',
    doneText: 'Parcel delivered. Happy building!',
    todoText: 'Estimated 3–5 business days after shipping.',
  },
];

function historyDate(order, status) {
  const entry = order.statusHistory?.find((h) => h.status === status);
  if (entry) return entry.at;
  // Fallback for orders that predate statusHistory
  if (status === 'processing') return order.createdAt;
  if (status === order.status) return order.updatedAt;
  return null;
}

function CheckDot({ color = 'bg-success' }) {
  return (
    <span className={`w-6 h-6 rounded-full ${color} flex items-center justify-center flex-shrink-0 relative z-10`}>
      <motion.svg
        className="w-3.5 h-3.5 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <motion.path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.5 12.75l6 6 9-13.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        />
      </motion.svg>
    </span>
  );
}

function CurrentDot() {
  return (
    <span className="w-6 h-6 rounded-full bg-accent-light border-2 border-accent flex items-center justify-center flex-shrink-0 relative z-10">
      <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
    </span>
  );
}

function TodoDot() {
  return (
    <span className="w-6 h-6 rounded-full bg-bg-alt border-2 border-border flex-shrink-0 relative z-10" />
  );
}

function CancelDot() {
  return (
    <span className="w-6 h-6 rounded-full bg-danger flex items-center justify-center flex-shrink-0 relative z-10">
      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </span>
  );
}

export default function OrderTimeline({ order }) {
  const { addToast } = useToast();
  const cancelled = order.status === 'cancelled';
  const reachedIdx = PHASES.findIndex((p) => p.key === order.status);
  const carrier = CARRIERS[order.trackingCarrier] || CARRIERS.auspost;

  const copyTracking = async () => {
    try {
      await navigator.clipboard.writeText(order.trackingNumber);
      addToast('Tracking number copied');
    } catch {
      addToast('Could not copy — select it manually', 'error');
    }
  };

  // Cancelled orders: placed → cancelled, no delivery phases
  const steps = cancelled
    ? [
        { ...PHASES[0], state: 'done', date: historyDate(order, 'processing') },
        {
          key: 'cancelled',
          title: 'Cancelled',
          doneText: 'This order was cancelled and the items returned to stock.',
          state: 'cancelled',
          date: historyDate(order, 'cancelled'),
        },
      ]
    : PHASES.map((p, i) => ({
        ...p,
        state: i < reachedIdx ? 'done' : i === reachedIdx ? 'current' : 'todo',
        date: i <= reachedIdx ? historyDate(order, p.key) : null,
      }));

  return (
    <div>
      {/* tracking number, once shipped */}
      {order.trackingNumber && !cancelled && (
        <div className="flex items-center gap-2 mb-3 bg-bg-alt/60 border border-border rounded-card px-3 py-2">
          <svg className="w-4 h-4 text-ink-light flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-ink-faint">
              Tracking number · {carrier.label}
            </p>
            <p className="font-mono text-xs text-ink font-medium truncate">{order.trackingNumber}</p>
          </div>
          <button
            onClick={copyTracking}
            className="btn-ghost !px-2 !py-1 text-xs flex items-center gap-1 flex-shrink-0"
            aria-label="Copy tracking number"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
            </svg>
            Copy
          </button>
          <a
            href={carrier.trackUrl(order.trackingNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost !px-2 !py-1 text-xs flex items-center gap-1 flex-shrink-0"
          >
            Track
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
        </div>
      )}

      {/* shipped but the staff haven't entered the tracking number yet */}
      {!order.trackingNumber && !cancelled && order.status !== 'processing' && (
        <p className="text-xs text-ink-faint mb-3 bg-bg-alt/60 border border-border rounded-card px-3 py-2">
          Your tracking number will appear here shortly.
        </p>
      )}

      {/* stepper */}
      <ol className="space-y-0">
        {steps.map((s, i) => {
          const last = i === steps.length - 1;
          return (
            <li key={s.key} className="relative flex gap-3 pb-5 last:pb-0">
              {/* connecting line */}
              {!last && (
                <span
                  className={`absolute left-3 top-6 -translate-x-1/2 w-0.5 h-full ${
                    s.state === 'done' ? 'bg-success/40' : 'bg-border'
                  }`}
                />
              )}
              {s.state === 'done' ? (
                <CheckDot />
              ) : s.state === 'current' ? (
                order.status === 'delivered' ? <CheckDot /> : <CurrentDot />
              ) : s.state === 'cancelled' ? (
                <CancelDot />
              ) : (
                <TodoDot />
              )}
              <div className="min-w-0 pt-0.5">
                <p
                  className={`text-sm font-medium ${
                    s.state === 'todo'
                      ? 'text-ink-faint'
                      : s.state === 'cancelled'
                        ? 'text-danger'
                        : 'text-ink'
                  }`}
                >
                  {s.title}
                </p>
                {s.date && <p className="text-xs text-ink-faint mt-0.5">{fmtDate(s.date)}</p>}
                <p className={`text-xs mt-0.5 ${s.state === 'todo' ? 'text-ink-faint' : 'text-ink-light'}`}>
                  {s.state === 'todo' ? s.todoText : s.doneText}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
