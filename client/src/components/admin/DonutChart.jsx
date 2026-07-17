import { useState } from 'react';

/* Hand-rolled SVG donut. Segments carry the category hue; all text stays in
   ink tokens. 2px surface gaps between segments; hover thickens the arc and
   shows a tooltip; click pins a detail row (handled by the parent). */

const CX = 100;
const CY = 100;
const R = 80;
const STROKE = 26;
const STROKE_HOVER = 30;
const GAP_DEG = (2 / R) * (180 / Math.PI); // ≈2px gap at the ring radius

const polar = (angleDeg) => {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [CX + R * Math.cos(a), CY + R * Math.sin(a)];
};

const arcPath = (start, end) => {
  const [sx, sy] = polar(start);
  const [ex, ey] = polar(end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${sx.toFixed(3)} ${sy.toFixed(3)} A ${R} ${R} 0 ${large} 1 ${ex.toFixed(3)} ${ey.toFixed(3)}`;
};

export default function DonutChart({ data, colorMap, centerLabel, centerValue, pinned, onPin }) {
  const [hovered, setHovered] = useState(null);
  const [tip, setTip] = useState({ x: 0, y: 0 });

  const total = data.reduce((s, d) => s + d.revenue, 0);

  // Build segment angles; suppress gaps when a single segment fills the ring
  const useGaps = data.length > 1;
  let angle = 0;
  const segments = data.map((d) => {
    const sweep = total > 0 ? (d.revenue / total) * 360 : 0;
    const gap = useGaps ? Math.min(GAP_DEG, sweep * 0.25) : 0;
    const start = angle + gap / 2;
    const end = Math.max(start + 0.2, angle + sweep - gap / 2); // keep tiny slices visible
    angle += sweep;
    return { ...d, start, end, sweep };
  });

  const hoveredSeg = segments.find((s) => s.category === hovered);

  return (
    <div
      className="relative"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
    >
      <svg viewBox="0 0 200 200" className="w-full max-w-[280px] mx-auto block" role="img" aria-label="Revenue by category">
        {segments.map((s) =>
          s.sweep >= 359.9 ? (
            <circle
              key={s.category}
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke={colorMap.get(s.category)}
              strokeWidth={hovered === s.category ? STROKE_HOVER : STROKE}
              style={{ transition: 'stroke-width 150ms ease', cursor: 'pointer' }}
              onMouseEnter={() => setHovered(s.category)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onPin(pinned === s.category ? null : s.category)}
            />
          ) : (
            <path
              key={s.category}
              d={arcPath(s.start, s.end)}
              fill="none"
              stroke={colorMap.get(s.category)}
              strokeWidth={hovered === s.category || pinned === s.category ? STROKE_HOVER : STROKE}
              strokeLinecap="butt"
              style={{ transition: 'stroke-width 150ms ease', cursor: 'pointer' }}
              onMouseEnter={() => setHovered(s.category)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onPin(pinned === s.category ? null : s.category)}
            />
          )
        )}
      </svg>

      {/* center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[10px] uppercase tracking-wider text-ink-faint">{centerLabel}</span>
        <span className="text-xl font-semibold text-ink tabular-nums">{centerValue}</span>
      </div>

      {/* hover tooltip */}
      {hoveredSeg && (
        <div
          className="absolute z-10 card px-3 py-2 text-xs shadow-card-hover pointer-events-none whitespace-nowrap"
          style={{ left: tip.x + 12, top: tip.y - 12 }}
        >
          <div className="flex items-center gap-1.5 font-medium text-ink">
            <span
              className="w-2.5 h-2.5 rounded-sm inline-block"
              style={{ background: colorMap.get(hoveredSeg.category) }}
            />
            {hoveredSeg.category}
          </div>
          <div className="text-ink-light mt-0.5 tabular-nums">
            ${hoveredSeg.revenue.toFixed(2)} · {total > 0 ? ((hoveredSeg.revenue / total) * 100).toFixed(1) : 0}% ·{' '}
            {hoveredSeg.units} unit{hoveredSeg.units !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
