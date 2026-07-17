import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ProductImage from '../../components/ProductImage';
import DonutChart from '../../components/admin/DonutChart';
import RevenueChart from '../../components/admin/RevenueChart';
import { staggerContainer, staggerItem } from '../../components/motion/variants';
import { assignCategoryColors, SEQ_FAINT } from '../../utils/chartColors';
import { STATUS_STYLES } from '../../utils/orderStatus';

const PERIODS = [
  { key: 'week', label: 'Week', span: '7 days' },
  { key: 'month', label: 'Month', span: '30 days' },
  { key: 'year', label: 'Year', span: '12 months' },
];

const money = (v) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* Delta vs previous period — arrow icon + text together, never color alone */
function Delta({ current, prev, span }) {
  if (prev === 0 && current === 0) {
    return <p className="text-xs text-ink-faint mt-1">— no change vs previous {span}</p>;
  }
  if (prev === 0) {
    return <p className="text-xs text-success font-medium mt-1">new this {span.includes('12') ? 'year' : 'period'}</p>;
  }
  const pct = ((current - prev) / prev) * 100;
  const up = pct >= 0;
  return (
    <p className={`text-xs font-medium mt-1 flex items-center gap-1 ${up ? 'text-success' : 'text-danger'}`}>
      <svg className={`w-3 h-3 ${up ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
      </svg>
      {Math.abs(pct).toFixed(1)}% vs previous {span}
    </p>
  );
}

function InsightRow({ icon, label, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-bg-alt/40 transition-colors"
        aria-expanded={open}
      >
        {icon}
        <span className="text-sm font-medium text-ink flex-1">{label}</span>
        <motion.svg
          animate={{ rotate: open ? 180 : 0 }}
          className="w-4 h-4 text-ink-faint"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </motion.svg>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-border/60">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const WarnIcon = (
  <svg className="w-4 h-4 text-yellow-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

export default function AdminDashboardPage() {
  const { addToast } = useToast();
  const [stats, setStats] = useState(null);
  const [report, setReport] = useState(null);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pinned, setPinned] = useState(null);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    api.fetchAdminStats().then(setStats).catch(() => addToast('Failed to load stats', 'error'));
  }, [addToast]);

  useEffect(() => {
    let stale = false;
    setLoading(true);
    setError(false);
    api
      .fetchAdminSalesReport(period)
      .then((r) => { if (!stale) setReport(r); })
      .catch(() => { if (!stale) setError(true); })
      .finally(() => { if (!stale) setLoading(false); });
    return () => { stale = true; };
  }, [period, retryTick]);

  // Colors follow the entity: assigned over ALL known categories alphabetically,
  // so a category keeps its hue when the period changes the breakdown.
  const colorMap = useMemo(
    () => assignCategoryColors(report?.byCategory.map((c) => c.category) ?? []),
    [report]
  );

  const span = PERIODS.find((p) => p.key === period).span;
  const pinnedCat = report?.byCategory.find((c) => c.category === pinned);

  if (error) {
    return (
      <div className="card p-10 text-center">
        <p className="text-ink-light mb-4">Couldn't load the sales report.</p>
        <button onClick={() => setRetryTick((t) => t + 1)} className="btn-primary">
          Try again
        </button>
      </div>
    );
  }

  if (loading || !report) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-44 bg-bg-alt rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card h-24 animate-pulse" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="card h-72 animate-pulse" />
          <div className="card h-72 animate-pulse" />
        </div>
      </div>
    );
  }

  const { summary, timeseries, byCategory, topProducts } = report;
  const maxTop = Math.max(...topProducts.map((p) => p.revenue), 1);
  const lowStock = stats?.lowStock ?? [];
  const soldOut = lowStock.filter((p) => p.stock === 0);
  const lowNotOut = lowStock.filter((p) => p.stock > 0);
  const allClear = lowStock.length === 0 && (stats?.processingCount ?? 0) === 0;

  return (
    <section className="space-y-5">
      {/* header + period toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-3xl text-ink">Dashboard</h1>
        <div className="flex gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => { setPeriod(p.key); setPinned(null); }}
              className={`px-3 py-1.5 rounded-card text-xs font-medium transition-all duration-200 ${
                period === p.key
                  ? 'bg-ink text-white scale-105'
                  : 'bg-bg-alt text-ink-light hover:text-ink border border-border'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* hero + KPI tiles */}
      <motion.div variants={staggerContainer} initial="initial" animate="enter" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={staggerItem} className="card p-5 col-span-2">
          <p className="text-xs uppercase tracking-wider text-ink-faint mb-1">Revenue · last {span} · excl. tax</p>
          <p className="text-4xl sm:text-5xl font-semibold text-ink tabular-nums">{money(summary.revenue)}</p>
          <Delta current={summary.revenue} prev={summary.prev.revenue} span={span} />
        </motion.div>
        <motion.div variants={staggerItem} className="card p-4">
          <p className="text-xs uppercase tracking-wider text-ink-faint mb-1">Orders</p>
          <p className="text-2xl font-semibold text-ink tabular-nums">{summary.orders}</p>
          <Delta current={summary.orders} prev={summary.prev.orders} span={span} />
        </motion.div>
        <motion.div variants={staggerItem} className="card p-4">
          <p className="text-xs uppercase tracking-wider text-ink-faint mb-1">Units sold</p>
          <p className="text-2xl font-semibold text-ink tabular-nums">{summary.units}</p>
          <Delta current={summary.units} prev={summary.prev.units} span={span} />
        </motion.div>
        <motion.div variants={staggerItem} className="card p-4">
          <p className="text-xs uppercase tracking-wider text-ink-faint mb-1">Avg order value</p>
          <p className="text-2xl font-semibold text-ink tabular-nums">{money(summary.avgOrder)}</p>
          <Delta current={summary.avgOrder} prev={summary.prev.avgOrder} span={span} />
        </motion.div>
        <motion.div variants={staggerItem} className="card p-4">
          <p className="text-xs uppercase tracking-wider text-ink-faint mb-1">Products</p>
          <p className="text-2xl font-semibold text-ink tabular-nums">{stats?.productCount ?? '—'}</p>
        </motion.div>
        <motion.div variants={staggerItem} className="card p-4">
          <p className="text-xs uppercase tracking-wider text-ink-faint mb-1">Customers</p>
          <p className="text-2xl font-semibold text-ink tabular-nums">{stats?.customerCount ?? '—'}</p>
        </motion.div>
        <motion.div variants={staggerItem}>
          <Link to="/admin/orders" className="card p-4 block hover:shadow-card-hover hover:border-border-hover transition-all">
            <p className="text-xs uppercase tracking-wider text-ink-faint mb-1">Awaiting shipment</p>
            <p className="text-2xl font-semibold text-accent tabular-nums">{stats?.processingCount ?? '—'}</p>
          </Link>
        </motion.div>
      </motion.div>

      {/* breakdown donut + revenue over time */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <h2 className="font-heading text-lg text-ink">How your revenue breaks down</h2>
          <p className="text-xs text-ink-faint mb-4">Hover a segment to see its share. Click to pin details.</p>

          {byCategory.length === 0 ? (
            <p className="text-sm text-ink-light py-10 text-center">No sales in this period.</p>
          ) : (
            <>
              <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-center">
                <DonutChart
                  data={byCategory}
                  colorMap={colorMap}
                  centerLabel="Total"
                  centerValue={money(summary.revenue)}
                  pinned={pinned}
                  onPin={setPinned}
                />
                {/* legend — visible values are required (three palette slots are low-contrast) */}
                <div className="space-y-1.5 min-w-[180px]">
                  {byCategory.map((c) => (
                    <button
                      key={c.category}
                      onClick={() => setPinned(pinned === c.category ? null : c.category)}
                      className={`w-full flex items-center gap-2 text-left px-2 py-1 rounded-card transition-colors ${
                        pinned === c.category ? 'bg-bg-alt' : 'hover:bg-bg-alt/60'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: colorMap.get(c.category) }} />
                      <span className="text-xs text-ink flex-1 truncate">{c.category}</span>
                      <span className="text-xs text-ink-light tabular-nums">
                        {money(c.revenue)} · {summary.revenue > 0 ? ((c.revenue / summary.revenue) * 100).toFixed(0) : 0}%
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* pinned detail row */}
              <AnimatePresence initial={false}>
                {pinnedCat && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 border border-border rounded-card p-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: colorMap.get(pinnedCat.category) }} />
                        <span className="text-sm font-medium text-ink flex-1">{pinnedCat.category}</span>
                        <span className="text-sm font-semibold text-ink tabular-nums">+{money(pinnedCat.revenue)}</span>
                        <button onClick={() => setPinned(null)} className="text-ink-faint hover:text-ink p-0.5" aria-label="Unpin">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-sm text-ink-light mt-1.5">
                        {pinnedCat.units} unit{pinnedCat.units !== 1 ? 's' : ''} sold in this category over the last {span} —{' '}
                        {summary.revenue > 0 ? ((pinnedCat.revenue / summary.revenue) * 100).toFixed(1) : 0}% of period revenue.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-heading text-lg text-ink mb-4">Revenue over time</h2>
          {timeseries.every((t) => t.revenue === 0) ? (
            <p className="text-sm text-ink-light py-10 text-center">No sales in this period.</p>
          ) : (
            <RevenueChart data={timeseries} period={period} />
          )}
        </div>
      </div>

      {/* top products + insights + recent orders */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <h2 className="font-heading text-lg text-ink mb-4">Top products · last {span}</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-ink-light py-6 text-center">No sales in this period.</p>
          ) : (
            <div className="space-y-2.5">
              {topProducts.map((p) => (
                <div key={p._id} className="relative flex items-center gap-3 px-2 py-1.5 rounded-card overflow-hidden">
                  {/* magnitude bar behind the row — sequential hue, not categorical */}
                  <span
                    className="absolute inset-y-0 left-0 rounded-card"
                    style={{ width: `${(p.revenue / maxTop) * 100}%`, background: SEQ_FAINT, opacity: 0.5 }}
                  />
                  <ProductImage src={p.imageUrl} alt={p.name} padding="p-1" className="w-9 h-9 flex-shrink-0 !bg-white border border-border/60 relative" />
                  <span className="text-sm text-ink truncate flex-1 relative">{p.name}</span>
                  <span className="text-xs text-ink-faint relative">{p.units} unit{p.units !== 1 ? 's' : ''}</span>
                  <span className="text-sm font-medium text-ink tabular-nums relative">{money(p.revenue)}</span>
                </div>
              ))}
            </div>
          )}
          <Link to="/admin/products" className="text-xs text-accent hover:text-accent-hover font-medium mt-4 inline-block">
            Manage products →
          </Link>
        </div>

        <div className="space-y-5">
          {/* insights */}
          <div className="card p-5">
            <h2 className="font-heading text-lg text-ink mb-4">Needs attention</h2>
            {allClear ? (
              <p className="text-sm text-success flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                All clear — no action needed.
              </p>
            ) : (
              <div className="space-y-2">
                {lowNotOut.length > 0 && (
                  <InsightRow icon={WarnIcon} label={`${lowNotOut.length} product${lowNotOut.length !== 1 ? 's' : ''} low on stock`}>
                    <div className="space-y-2 mt-2">
                      {lowNotOut.map((p) => (
                        <div key={p._id} className="flex items-center gap-2.5">
                          <ProductImage src={p.imageUrl} alt={p.name} padding="p-0.5" className="w-8 h-8 flex-shrink-0 !bg-white border border-border/60" />
                          <span className="text-xs text-ink truncate flex-1">{p.name}</span>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border bg-yellow-50 text-yellow-700 border-yellow-200">
                            {p.stock} left
                          </span>
                        </div>
                      ))}
                      <Link to="/admin/products" className="text-xs text-accent hover:text-accent-hover font-medium inline-block">
                        Manage products →
                      </Link>
                    </div>
                  </InsightRow>
                )}
                {soldOut.length > 0 && (
                  <InsightRow icon={WarnIcon} label={`${soldOut.length} product${soldOut.length !== 1 ? 's' : ''} sold out`}>
                    <div className="space-y-2 mt-2">
                      {soldOut.map((p) => (
                        <div key={p._id} className="flex items-center gap-2.5">
                          <ProductImage src={p.imageUrl} alt={p.name} padding="p-0.5" className="w-8 h-8 flex-shrink-0 !bg-white border border-border/60" />
                          <span className="text-xs text-ink truncate flex-1">{p.name}</span>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border bg-red-100 text-red-700 border-red-200">
                            Sold Out
                          </span>
                        </div>
                      ))}
                      <Link to="/admin/products" className="text-xs text-accent hover:text-accent-hover font-medium inline-block">
                        Restock →
                      </Link>
                    </div>
                  </InsightRow>
                )}
                {(stats?.processingCount ?? 0) > 0 && (
                  <InsightRow icon={WarnIcon} label={`${stats.processingCount} order${stats.processingCount !== 1 ? 's' : ''} awaiting shipment`}>
                    <p className="text-xs text-ink-light mt-2 mb-2">
                      These orders are paid and waiting to be marked as shipped.
                    </p>
                    <Link to="/admin/orders" className="text-xs text-accent hover:text-accent-hover font-medium">
                      View orders →
                    </Link>
                  </InsightRow>
                )}
              </div>
            )}
          </div>

          {/* recent orders */}
          <div className="card p-5">
            <h2 className="font-heading text-lg text-ink mb-4">Recent orders</h2>
            {(stats?.recentOrders ?? []).length === 0 ? (
              <p className="text-sm text-ink-light py-4 text-center">No orders yet.</p>
            ) : (
              <div className="space-y-2.5">
                {stats.recentOrders.map((o) => (
                  <div key={o._id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs text-ink font-medium">{o.orderNumber}</p>
                      <p className="text-xs text-ink-faint truncate">
                        {o.userId?.name ?? 'Unknown customer'} ·{' '}
                        {new Date(o.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <span className={`badge capitalize ${STATUS_STYLES[o.status] || 'bg-bg-alt text-ink-light'}`}>{o.status}</span>
                    <span className="text-sm font-medium text-ink tabular-nums w-20 text-right">${o.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
            <Link to="/admin/orders" className="text-xs text-accent hover:text-accent-hover font-medium mt-4 inline-block">
              View all orders →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
