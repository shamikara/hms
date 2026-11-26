import type { RevenueTrend, TrendCategory } from "@/features/billing/actions/finance.actions";

/**
 * Twelve months of money, drawn as plain SVG (no chart library).
 *
 * Bars: charges posted each month, stacked by what they were for, so the bar
 * height is everything billed. Line: money actually received that month, net
 * of refunds. A gap between the two is billing that has not been paid yet (or
 * advance payments for later stays). Hover a month for its figures.
 */

const SERIES: { key: TrendCategory; label: string; fill: string }[] = [
  { key: "ROOM_RATE", label: "Rooms", fill: "#059669" },
  { key: "F_AND_B", label: "Food & drink", fill: "#f59e0b" },
  { key: "SAFARI", label: "Safari", fill: "#0284c7" },
  { key: "OTHER", label: "Other", fill: "#a8a29e" },
];

const W = 900;
const H = 300;
const PAD = { top: 16, right: 12, bottom: 34, left: 64 };

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  const f = value / exp;
  // Rounded so the four gridlines land on readable numbers.
  const step = [1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10].find((c) => f <= c) ?? 10;
  return step * exp;
}

export function RevenueTrendChart({ trend }: { trend: RevenueTrend }) {
  const { months, currencyCode } = trend;
  const money = new Intl.NumberFormat("en-LK", { style: "currency", currency: currencyCode, maximumFractionDigits: 0 });
  const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
  const monthName = (key: string, long = false) =>
    new Intl.DateTimeFormat("en-GB", { month: long ? "long" : "short", year: long ? "numeric" : undefined, timeZone: "UTC" }).format(
      new Date(`${key}-15T00:00:00Z`),
    );

  const charged = months.map((m) => SERIES.reduce((s, c) => s + m.charges[c.key], 0));
  const totalCharged = charged.reduce((a, b) => a + b, 0);
  const totalReceived = months.reduce((a, m) => a + m.received, 0);
  const best = months.reduce((b, m) => (m.received > b.received ? m : b), months[0]);
  const top = niceMax(Math.max(...charged, ...months.map((m) => m.received), 0));
  const low = Math.min(0, ...months.map((m) => m.received));
  const span = top - low;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const col = plotW / months.length;
  const barW = Math.min(38, col * 0.58);
  const y = (v: number) => PAD.top + plotH * (1 - (v - low) / span);
  const cx = (i: number) => PAD.left + col * i + col / 2;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => low + span * t);

  const linePts = months.map((m, i) => `${cx(i).toFixed(1)},${y(m.received).toFixed(1)}`).join(" ");
  const empty = totalCharged === 0 && totalReceived === 0;

  return (
    <section className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm">
      <header className="px-6 pt-5 pb-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-lg text-stone-900 dark:text-white">Revenue, last 12 months</h2>
          <p className="text-xs text-stone-500 mt-1">
            Bars: charges posted, by type. Line: money received after refunds. Hover a month for figures.
          </p>
        </div>
        <dl className="flex gap-6 text-right">
          <div>
            <dt className="text-[10px] font-mono uppercase tracking-wider text-stone-500">Received</dt>
            <dd className="font-serif text-xl text-stone-900 dark:text-white">{money.format(totalReceived)}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-mono uppercase tracking-wider text-stone-500">Charged</dt>
            <dd className="font-serif text-xl text-stone-900 dark:text-white">{money.format(totalCharged)}</dd>
          </div>
          {!empty && best.received > 0 && (
            <div className="hidden sm:block">
              <dt className="text-[10px] font-mono uppercase tracking-wider text-stone-500">Best month</dt>
              <dd className="font-serif text-xl text-stone-900 dark:text-white">{monthName(best.key)}</dd>
            </div>
          )}
        </dl>
      </header>

      <ul className="px-6 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600 dark:text-stone-400">
        {SERIES.map((s) => (
          <li key={s.key} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.fill }} /> {s.label}
          </li>
        ))}
        <li className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-stone-900 dark:bg-white" /> Received
        </li>
      </ul>

      {empty ? (
        <p className="px-6 py-16 text-center text-sm text-stone-500">
          No charges or payments in the last 12 months yet. The chart fills in as bills are posted and paid.
        </p>
      ) : (
        <div className="overflow-x-auto px-2 pb-4">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[640px]" role="img" aria-label={`Revenue for the last 12 months: ${money.format(totalReceived)} received, ${money.format(totalCharged)} charged.`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="stroke-stone-200 dark:stroke-stone-800" strokeWidth={t === 0 ? 1.2 : 1} />
                <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="fill-stone-500 text-[11px] font-mono">
                  {compact.format(t)}
                </text>
              </g>
            ))}

            {months.map((m, i) => {
              let base = 0;
              const last = i === months.length - 1;
              const tip = [
                `${monthName(m.key, true)}${last ? " (so far)" : ""}`,
                `Received: ${money.format(m.received)}`,
                `Charged: ${money.format(charged[i])}`,
                ...SERIES.filter((s) => m.charges[s.key] !== 0).map((s) => `  ${s.label}: ${money.format(m.charges[s.key])}`),
              ].join("\n");
              return (
                <g key={m.key}>
                  {SERIES.map((s) => {
                    const v = m.charges[s.key];
                    if (v <= 0) return null;
                    const y0 = y(base);
                    base += v;
                    const y1 = y(base);
                    return <rect key={s.key} x={cx(i) - barW / 2} y={y1} width={barW} height={Math.max(0, y0 - y1)} fill={s.fill} rx={2} />;
                  })}
                  <text x={cx(i)} y={H - 12} textAnchor="middle" className={`text-[11px] ${last ? "fill-stone-900 dark:fill-white font-semibold" : "fill-stone-500"}`}>
                    {monthName(m.key)}
                  </text>
                  <rect x={PAD.left + col * i} y={PAD.top} width={col} height={plotH} fill="transparent" className="hover:fill-stone-500/5">
                    <title>{tip}</title>
                  </rect>
                </g>
              );
            })}

            <polyline points={linePts} fill="none" className="stroke-stone-900 dark:stroke-white" strokeWidth={2} strokeLinejoin="round" pointerEvents="none" />
            {months.map((m, i) => (
              <circle key={m.key} cx={cx(i)} cy={y(m.received)} r={3.5} className="fill-white dark:fill-stone-900 stroke-stone-900 dark:stroke-white" strokeWidth={2} pointerEvents="none" />
            ))}
          </svg>
        </div>
      )}
    </section>
  );
}
