"use client";

// ─── Training history ────────────────────────────────────────────────────────
// Phase 1 (epochs 1-10): head training, both backbones frozen
// Phase 2 (epochs 11-50): selective fine-tuning
const TRAIN_ACC = [
  0.6485, 0.7011, 0.7344, 0.7522, 0.7795, 0.7854, 0.8017, 0.8009, 0.8108, 0.8187,
  0.8084, 0.8143, 0.8151, 0.8211, 0.8108, 0.8207, 0.8155, 0.8266, 0.8286, 0.8187,
  0.8151, 0.8171, 0.8381, 0.8250, 0.8238, 0.8274, 0.8373, 0.8337, 0.8219, 0.8294,
  0.8329, 0.8076, 0.8349, 0.8238, 0.8310, 0.8306, 0.8278, 0.8258, 0.8302, 0.8282,
  0.8306, 0.8349, 0.8290, 0.8317, 0.8302, 0.8317, 0.8329, 0.8357, 0.8333, 0.8385,
];
const VAL_ACC = [
  0.7350, 0.7650, 0.7750, 0.7750, 0.8150, 0.8100, 0.8150, 0.8150, 0.8400, 0.7950,
  0.8400, 0.8400, 0.8350, 0.8400, 0.8400, 0.8350, 0.8400, 0.8400, 0.8400, 0.8400,
  0.8400, 0.8350, 0.8400, 0.8400, 0.8400, 0.8400, 0.8400, 0.8450, 0.8400, 0.8400,
  0.8400, 0.8350, 0.8350, 0.8350, 0.8350, 0.8350, 0.8400, 0.8400, 0.8450, 0.8450,
  0.8400, 0.8350, 0.8450, 0.8400, 0.8400, 0.8350, 0.8350, 0.8450, 0.8400, 0.8450,
];
const TRAIN_LOSS = [
  0.4070, 0.2362, 0.2027, 0.1955, 0.1823, 0.1831, 0.1756, 0.1769, 0.1706, 0.1692,
  0.1667, 0.1656, 0.1641, 0.1648, 0.1642, 0.1644, 0.1645, 0.1626, 0.1600, 0.1642,
  0.1643, 0.1644, 0.1573, 0.1587, 0.1574, 0.1610, 0.1572, 0.1580, 0.1628, 0.1598,
  0.1568, 0.1626, 0.1589, 0.1604, 0.1576, 0.1580, 0.1578, 0.1564, 0.1592, 0.1581,
  0.1609, 0.1551, 0.1577, 0.1548, 0.1601, 0.1600, 0.1599, 0.1572, 0.1577, 0.1559,
];
const VAL_LOSS = [
  0.1967, 0.1987, 0.1939, 0.1873, 0.1759, 0.1752, 0.1749, 0.1705, 0.1691, 0.1706,
  0.1674, 0.1671, 0.1663, 0.1659, 0.1653, 0.1650, 0.1648, 0.1651, 0.1648, 0.1645,
  0.1644, 0.1642, 0.1642, 0.1640, 0.1639, 0.1637, 0.1637, 0.1636, 0.1634, 0.1633,
  0.1632, 0.1636, 0.1635, 0.1633, 0.1634, 0.1631, 0.1632, 0.1633, 0.1632, 0.1632,
  0.1631, 0.1631, 0.1628, 0.1630, 0.1630, 0.1630, 0.1631, 0.1630, 0.1632, 0.1630,
];

const N = TRAIN_ACC.length;  // 50
const PHASE1_END = 10;

// ─── SVG layout ──────────────────────────────────────────────────────────────
const VW = 560;
const VH = 240;
const M  = { t: 16, r: 16, b: 38, l: 46 };
const PW = VW - M.l - M.r;
const PH = VH - M.t - M.b;

function cx(epoch: number) {
  return M.l + ((epoch - 1) / (N - 1)) * PW;
}
function cy(val: number, yMin: number, yMax: number) {
  return M.t + PH - ((val - yMin) / (yMax - yMin)) * PH;
}
function makePath(values: number[], yMin: number, yMax: number) {
  return values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${cx(i + 1).toFixed(1)} ${cy(v, yMin, yMax).toFixed(1)}`)
    .join(" ");
}

// ─── Sub-chart ────────────────────────────────────────────────────────────────
interface Series {
  values: number[];
  color: string;
  dash?: string;
  label: string;
}
interface HLine {
  y: number;
  color: string;
  dash: string;
  label: string;
}
interface ChartProps {
  title: string;
  series: Series[];
  yMin: number;
  yMax: number;
  yTicks: number[];
  yFmt: (v: number) => string;
  hLines?: HLine[];
}

function SubChart({ title, series, yMin, yMax, yTicks, yFmt, hLines = [] }: ChartProps) {
  const xTicks = [1, 10, 20, 30, 40, 50];
  const sepX = cx(PHASE1_END + 0.5);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="mb-2 text-center text-sm font-semibold text-foreground">{title}</p>

      <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" aria-hidden="true">
        {/* Horizontal grid */}
        {yTicks.map((v) => {
          const y = cy(v, yMin, yMax).toFixed(1);
          return (
            <line key={v} x1={M.l} y1={y} x2={M.l + PW} y2={y}
              stroke="hsl(var(--border))" strokeWidth="0.6" />
          );
        })}

        {/* Phase separator */}
        <line x1={sepX.toFixed(1)} y1={M.t} x2={sepX.toFixed(1)} y2={M.t + PH}
          stroke="hsl(var(--muted-foreground))" strokeWidth="1"
          strokeDasharray="4 3" opacity="0.45" />
        <text x={(M.l + sepX) / 2} y={M.t + 10}
          textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))" opacity="0.6">
          Ph 1
        </text>
        <text x={(sepX + M.l + PW) / 2} y={M.t + 10}
          textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))" opacity="0.6">
          Fine-tuning
        </text>

        {/* Horizontal reference lines */}
        {hLines.map(({ y, color, dash, label }) => {
          const yp = cy(y, yMin, yMax);
          return (
            <g key={label}>
              <line x1={M.l} y1={yp.toFixed(1)} x2={M.l + PW} y2={yp.toFixed(1)}
                stroke={color} strokeWidth="1.2" strokeDasharray={dash} />
              <text x={M.l + PW - 3} y={yp - 3}
                textAnchor="end" fontSize="9" fill={color}>{label}</text>
            </g>
          );
        })}

        {/* Data paths */}
        {series.map(({ values, color, dash, label }) => (
          <path key={label}
            d={makePath(values, yMin, yMax)}
            fill="none" stroke={color} strokeWidth="2"
            strokeDasharray={dash} strokeLinecap="round" strokeLinejoin="round" />
        ))}

        {/* Y axis */}
        <line x1={M.l} y1={M.t} x2={M.l} y2={M.t + PH}
          stroke="hsl(var(--border))" strokeWidth="1" />
        {yTicks.map((v) => {
          const y = cy(v, yMin, yMax);
          return (
            <g key={v}>
              <line x1={M.l - 3} y1={y} x2={M.l} y2={y}
                stroke="hsl(var(--border))" strokeWidth="1" />
              <text x={M.l - 6} y={y + 4}
                textAnchor="end" fontSize="10" fill="hsl(var(--muted-foreground))">
                {yFmt(v)}
              </text>
            </g>
          );
        })}

        {/* X axis */}
        <line x1={M.l} y1={M.t + PH} x2={M.l + PW} y2={M.t + PH}
          stroke="hsl(var(--border))" strokeWidth="1" />
        {xTicks.map((e) => {
          const x = cx(e);
          return (
            <g key={e}>
              <line x1={x} y1={M.t + PH} x2={x} y2={M.t + PH + 4}
                stroke="hsl(var(--border))" strokeWidth="1" />
              <text x={x} y={M.t + PH + 15}
                textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))">
                {e}
              </text>
            </g>
          );
        })}

        {/* Epoch label */}
        <text x={M.l + PW / 2} y={VH - 1}
          textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))">
          Epoch
        </text>
      </svg>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
        {[...series, ...hLines].map(({ color, label, ...rest }) => {
          const dash = (rest as Series).dash ?? (rest as HLine).dash;
          return (
            <span key={label} className="flex items-center gap-1.5">
              <svg width="20" height="8" aria-hidden="true">
                <line x1="0" y1="4" x2="20" y2="4"
                  stroke={color} strokeWidth="2" strokeDasharray={dash} />
              </svg>
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────
export function TrainingCurves({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <div className="grid gap-6 md:grid-cols-2">
        <SubChart
          title="Accuracy"
          yMin={0.60} yMax={0.90}
          yTicks={[0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90]}
          yFmt={(v) => `${(v * 100).toFixed(0)}%`}
          series={[
            { values: TRAIN_ACC, color: "hsl(var(--primary))", label: "Train" },
            { values: VAL_ACC,   color: "#f97316", dash: "6 3", label: "Validation" },
          ]}
        />
        <SubChart
          title="Loss (Binary Focal Cross-entropy)"
          yMin={0.14} yMax={0.42}
          yTicks={[0.15, 0.20, 0.25, 0.30, 0.35, 0.40]}
          yFmt={(v) => v.toFixed(2)}
          series={[
            { values: TRAIN_LOSS, color: "hsl(var(--primary))", label: "Train" },
            { values: VAL_LOSS,   color: "#f97316", dash: "6 3", label: "Validation" },
          ]}
        />
      </div>
    </div>
  );
}
