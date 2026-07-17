import { useState } from 'react';
import { SEQ_BASE, SEQ_HOVER } from '../../utils/chartColors';

/* Hand-rolled SVG column chart: single series (no legend — the card title
   names it), one hue, 4px rounded data-ends, hairline baseline + gridlines,
   per-bucket hover tooltip with an invisible full-height hit target.
   Bucket dates are UTC — all labels are formatted in UTC to match. */

const W = 600;
const H = 220;
const M = { top: 10, right: 8, bottom: 22, left: 44 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;

const fmtAxis = (v) => (v >= 1000 ? `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `$${Math.round(v)}`);

const niceMax = (max) => {
  if (max <= 0) return 100;
  const pow = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (max <= m * pow) return m * pow;
  }
  return 10 * pow;
};

const labelFor = (iso, period) => {
  const d = new Date(iso);
  const utc = { timeZone: 'UTC' };
  if (period === 'week') return d.toLocaleDateString(undefined, { ...utc, weekday: 'short' });
  if (period === 'year') return d.toLocaleDateString(undefined, { ...utc, month: 'short' });
  return d.toLocaleDateString(undefined, { ...utc, day: 'numeric' });
};

const tooltipDate = (iso, period) => {
  const d = new Date(iso);
  const utc = { timeZone: 'UTC' };
  if (period === 'year') return d.toLocaleDateString(undefined, { ...utc, month: 'long', year: 'numeric' });
  return d.toLocaleDateString(undefined, { ...utc, weekday: 'short', day: 'numeric', month: 'short' });
};

// Rounded top corners only — flat at the baseline (4px data-end radius)
const barPath = (x, y, w, h) => {
  if (h <= 0) return '';
  const r = Math.min(4, h / 2, w / 2);
  return `M ${x} ${y + h} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} L ${x + w - r} ${y} Q ${x + w} ${y} ${x + w} ${y + r} L ${x + w} ${y + h} Z`;
};

export default function RevenueChart({ data, period }) {
  const [hovered, setHovered] = useState(null);

  const max = niceMax(Math.max(...data.map((d) => d.revenue), 0));
  const ticks = [0, max / 3, (2 * max) / 3, max];
  const n = data.length || 1;
  const band = PLOT_W / n;
  const barW = Math.max(Math.min(band * 0.7, 48), 3);
  // Label every bucket for week/year; every 5th for the 30-day month view
  const labelEvery = period === 'month' ? 5 : 1;

  const hoveredBucket = hovered != null ? data[hovered] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full block" role="img" aria-label="Revenue over time">
        {/* gridlines + y labels */}
        {ticks.map((t) => {
          const y = M.top + PLOT_H - (t / max) * PLOT_H;
          return (
            <g key={t}>
              <line x1={M.left} x2={W - M.right} y1={y} y2={y} stroke={t === 0 ? '#d1cdc6' : '#e8e5e0'} strokeWidth="1" />
              <text x={M.left - 6} y={y + 3} textAnchor="end" fontSize="10" fill="#a3a3a3" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {fmtAxis(t)}
              </text>
            </g>
          );
        })}

        {/* bars + hover targets + x labels */}
        {data.map((d, i) => {
          const h = (d.revenue / max) * PLOT_H;
          const x = M.left + i * band + (band - barW) / 2;
          const y = M.top + PLOT_H - h;
          return (
            <g key={d.date}>
              {d.revenue > 0 && (
                <path
                  d={barPath(x, y, barW, h)}
                  fill={hovered === i ? SEQ_HOVER : SEQ_BASE}
                  style={{ transition: 'fill 120ms ease' }}
                />
              )}
              {/* invisible full-height hit target, bigger than the mark */}
              <rect
                x={M.left + i * band}
                y={M.top}
                width={band}
                height={PLOT_H}
                fill="transparent"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
              {i % labelEvery === 0 && (
                <text
                  x={M.left + i * band + band / 2}
                  y={H - 7}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#a3a3a3"
                >
                  {labelFor(d.date, period)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* tooltip */}
      {hoveredBucket && (
        <div
          className="absolute z-10 card px-3 py-2 text-xs shadow-card-hover pointer-events-none whitespace-nowrap"
          style={{
            left: `${((M.left + hovered * band + band / 2) / W) * 100}%`,
            top: 0,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="font-medium text-ink">{tooltipDate(hoveredBucket.date, period)}</div>
          <div className="text-ink-light mt-0.5 tabular-nums">
            ${hoveredBucket.revenue.toFixed(2)} · {hoveredBucket.orders} order{hoveredBucket.orders !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
