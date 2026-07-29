import { useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type FDI = string;

export type ToothType = "incisor" | "canine" | "premolar" | "molar";

export type Quadrant = 1 | 2 | 3 | 4;

export type ToothPattern = "none" | "hatch" | "cross" | "dots";

export interface ToothStatusDef {
  id: string;
  /** Fill colour — hex or a CSS value such as `hsl(var(--primary))`. */
  color: string;
  strokeColor?: string;
  /** Human label, used in the native tooltip and the aria-label. */
  label?: string;
  pattern?: ToothPattern;
}

export interface ToothMeta {
  fdi: FDI;
  quadrant: Quadrant;
  type: ToothType;
  /** 0-based position within its own row (0 = far left of that jaw). */
  index: number;
}

export interface DentalChartProps {
  /** FDI number → status id, e.g. `{ "16": "caries", "24": "filling" }`. */
  values?: Record<FDI, string>;
  statuses?: ToothStatusDef[];
  layout?: "arch" | "row";
  selectedTeeth?: FDI[];
  disabledTeeth?: FDI[];
  /** e.g. hide the wisdom teeth with `["18", "28", "38", "48"]`. */
  hiddenTeeth?: FDI[];
  showNumbers?: boolean;
  showQuadrantLines?: boolean;
  /**
   * Caps how wide the chart may grow, so it stays readable instead of
   * stretching across a large screen. Any CSS length; default 440px.
   * Pass `"none"` to let it fill its container.
   */
  maxWidth?: number | string;
  /** i18n overrides for tooth-type and jaw names (see DEFAULT_LABELS). */
  labels?: Partial<Record<string, string>>;
  onToothClick?: (fdi: FDI, event: React.MouseEvent | React.KeyboardEvent, element: SVGGElement) => void;
  onToothHover?: (fdi: FDI | null) => void;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Geometry constants — the whole arch is driven from here
// ─────────────────────────────────────────────────────────────────────────────

const VIEWBOX = { width: 300, height: 192 } as const;

/**
 * Each jaw sits on its own half-ellipse. The two centres are pulled apart
 * vertically so a clear gap (the occlusal midline) opens between the rows.
 *
 * The radii are tuned so the ellipse's half-perimeter (~311px) is just wider
 * than the 262px of tooth widths in a row, leaving a uniform ~3px gap between
 * neighbours (see SLOTS) — tight arch, short chart.
 */
const ARCH = {
  cx: VIEWBOX.width / 2,
  /** Centre of the upper half-ellipse; its arc bulges upward. */
  upperCy: 88,
  /** Centre of the lower half-ellipse; its arc bulges downward. */
  lowerCy: 104,
  radiusX: 128,
  radiusY: 65,
  /** Sweep of one jaw, in degrees, measured on the ellipse. */
  startAngle: 180,
  endAngle: 360,
  /** How far outside the arc the FDI numbers are drawn. */
  numberOffset: 16,
} as const;

/** Flat two-row fallback layout. */
const ROW = {
  startX: 6,
  step: 18,
  upperY: 70,
  lowerY: 125,
  numberOffset: 16,
} as const;

const TEETH_PER_ROW = 16;

/** Bounding sizes per tooth type — used for hit-area and spacing decisions. */
const TOOTH_SIZE: Record<ToothType, { width: number; height: number }> = {
  incisor: { width: 15, height: 18 },
  canine: { width: 15, height: 21 },
  premolar: { width: 16, height: 15 },
  molar: { width: 18, height: 17 },
};

/**
 * Hit-area floor, in viewBox units. Kept just under the ~19.5px slot so
 * neighbouring targets never overlap; at a typical rendered width (≥600px this
 * scales by 2×) it still clears the 32px physical touch-target guideline.
 */
const MIN_HIT_SIZE = 18;

const NEUTRAL_FILL = "#F8FAFC";
const NEUTRAL_STROKE = "#94A3B8";

// ─────────────────────────────────────────────────────────────────────────────
// Tooth silhouettes — occlusal (top-down) view, drawn around (0,0)
// ─────────────────────────────────────────────────────────────────────────────

interface ToothShape {
  /** Outer silhouette. */
  outline: string;
  /** Inner surface lines (fissures / ridges) that make the tooth read as real. */
  detail: string;
}

const SHAPES: Record<ToothType, ToothShape> = {
  // Narrow and rectangular with a straight incisal edge. (15 × 18)
  incisor: {
    outline:
      "M -6.5 -9 Q -7.5 -9 -7.5 -7.5 L -7 6.5 Q -7 9 -4.5 9 L 4.5 9 Q 7 9 7 6.5 L 7.5 -7.5 Q 7.5 -9 6.5 -9 Z",
    detail: "M -4.5 6 L 4.5 6",
  },
  // Pointed and slightly elongated, with a central ridge. (15 × 21)
  canine: {
    outline:
      "M -6.5 -10.5 Q -7.5 -10.5 -7.5 -9 L -6.5 3 Q -6 9 0 10.5 Q 6 9 6.5 3 L 7.5 -9 Q 7.5 -10.5 6.5 -10.5 Z",
    detail: "M 0 -4.5 L 0 8",
  },
  // Oval with two cusps split by a mesio-distal fissure. (16 × 15)
  premolar: {
    outline:
      "M 0 -7.5 Q 6 -7.5 7.5 -4 Q 8 0 7.5 4 Q 6 7.5 0 7.5 Q -6 7.5 -7.5 4 Q -8 0 -7.5 -4 Q -6 -7.5 0 -7.5 Z",
    detail: "M -4.5 0 L 4.5 0",
  },
  // Wide and near-square with a four-cusp cross fissure. (18 × 17)
  molar: {
    outline:
      "M -6.5 -8.5 Q -9 -8.5 -9 -6 L -9 6 Q -9 8.5 -6.5 8.5 L 6.5 8.5 Q 9 8.5 9 6 L 9 -6 Q 9 -8.5 6.5 -8.5 Z",
    detail: "M 0 -6 L 0 6 M -6.5 0 L 6.5 0",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Static data
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_STATUSES: ToothStatusDef[] = [
  { id: "healthy", color: "#F8FAFC", strokeColor: "#94A3B8", label: "Sog'lom" },
  { id: "caries", color: "#F59E0B", strokeColor: "#B45309", label: "Karies", pattern: "dots" },
  { id: "filling", color: "#3B82F6", strokeColor: "#1D4ED8", label: "Plomba" },
  { id: "crown", color: "#EAB308", strokeColor: "#A16207", label: "Koronka", pattern: "hatch" },
  { id: "root_canal", color: "#EC4899", strokeColor: "#BE185D", label: "Kanal davolash", pattern: "cross" },
  { id: "implant", color: "#8B5CF6", strokeColor: "#6D28D9", label: "Implant" },
  { id: "missing", color: "#E2E8F0", strokeColor: "#94A3B8", label: "Yo'q" },
];

export const DEFAULT_LABELS: Record<string, string> = {
  incisor: "kesuvchi tish",
  canine: "qoziq tish",
  premolar: "kichik oziq tish",
  molar: "katta oziq tish",
  upper: "Yuqori jag'",
  lower: "Pastki jag'",
  tooth: "Tish",
};

/** Tooth type follows the second FDI digit: 1–2 incisor, 3 canine, 4–5 premolar, 6–8 molar. */
function typeFromFdi(fdi: FDI): ToothType {
  const position = Number(fdi[1]);
  if (position <= 2) return "incisor";
  if (position === 3) return "canine";
  if (position <= 5) return "premolar";
  return "molar";
}

/** Row order, left → right on screen, exactly as the spec lists it. */
const UPPER_ORDER: FDI[] = [
  "18", "17", "16", "15", "14", "13", "12", "11",
  "21", "22", "23", "24", "25", "26", "27", "28",
];
const LOWER_ORDER: FDI[] = [
  "48", "47", "46", "45", "44", "43", "42", "41",
  "31", "32", "33", "34", "35", "36", "37", "38",
];

export const TEETH: ToothMeta[] = [...UPPER_ORDER, ...LOWER_ORDER].map((fdi, i) => ({
  fdi,
  quadrant: Number(fdi[0]) as Quadrant,
  type: typeFromFdi(fdi),
  index: i % TEETH_PER_ROW,
}));

const isUpper = (fdi: FDI) => fdi[0] === "1" || fdi[0] === "2";

// ─────────────────────────────────────────────────────────────────────────────
// Arch maths (pure)
// ─────────────────────────────────────────────────────────────────────────────

export interface ToothTransform {
  x: number;
  y: number;
  /** Degrees; rotates the crown so it faces out along the arch. */
  angle: number;
  /** Where the always-horizontal FDI label sits, just outside the arc. */
  labelX: number;
  labelY: number;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Equal steps in θ do NOT give equal spacing on an ellipse: the arc speed
 * |dP/dθ| = √(rx²sin²θ + ry²cos²θ) peaks at the front of the arch (rx) and
 * bottoms out at the sides (ry). With rx=128 / ry=65 that is a ~2× difference,
 * which shows up as gappy front teeth and cramped molars.
 *
 * So the sweep is sampled once into a cumulative arc-length table, and teeth
 * are placed by *distance along the curve* instead of by angle.
 */
function buildArcTable(steps = 720) {
  const { radiusX: rx, radiusY: ry, startAngle, endAngle } = ARCH;
  const speed = (deg: number) => Math.hypot(rx * Math.sin(toRad(deg)), ry * Math.cos(toRad(deg)));

  const dTheta = (endAngle - startAngle) / steps;
  const thetas: number[] = [startAngle];
  const lengths: number[] = [0];
  let acc = 0;
  // Trapezoidal integration of the speed over the sweep.
  for (let i = 1; i <= steps; i += 1) {
    const prev = startAngle + (i - 1) * dTheta;
    const curr = startAngle + i * dTheta;
    acc += ((speed(prev) + speed(curr)) / 2) * toRad(dTheta);
    thetas.push(curr);
    lengths.push(acc);
  }
  return { thetas, lengths, total: acc };
}

const ARC_TABLE = buildArcTable();

/** Inverse lookup: arc length → θ, binary search plus linear interpolation. */
function thetaAtArcLength(distance: number): number {
  const { thetas, lengths, total } = ARC_TABLE;
  const target = Math.min(Math.max(distance, 0), total);
  let lo = 0;
  let hi = lengths.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (lengths[mid] <= target) lo = mid;
    else hi = mid;
  }
  const span = lengths[hi] - lengths[lo];
  const f = span === 0 ? 0 : (target - lengths[lo]) / span;
  return thetas[lo] + (thetas[hi] - thetas[lo]) * f;
}

/**
 * Arc-length centre of every slot. Each tooth claims its own width, and the
 * leftover arc is split into one identical gap between neighbours — so a wide
 * molar and a narrow incisor both sit with the same visual breathing room.
 * Both jaws share this layout (their type sequence is identical).
 */
const SLOTS = (() => {
  const widths = UPPER_ORDER.map((fdi) => TOOTH_SIZE[typeFromFdi(fdi)].width);
  const toothTotal = widths.reduce((sum, w) => sum + w, 0);
  const gap = (ARC_TABLE.total - toothTotal) / TEETH_PER_ROW;

  const centers: number[] = [];
  let cursor = gap / 2;
  for (const width of widths) {
    centers.push(cursor + width / 2);
    cursor += width + gap;
  }
  return { centers, gap };
})();

/**
 * Places one tooth on its jaw's half-ellipse.
 *
 * The point is the standard ellipse parametrisation
 *   x = cx + rx·cos θ,  y = cy + ry·sin θ
 * swept from `startAngle` to `endAngle` across the 16 slots of a row, so a
 * tooth sits at the centre of its slot.
 *
 * The rotation follows the ellipse's outward normal. For F(x,y) = (x/rx)² +
 * (y/ry)² the gradient at θ is (cos θ / rx, sin θ / ry), so the normal angle is
 * atan2(sin θ / ry, cos θ / rx). Shapes are drawn pointing "up", hence the +90°.
 *
 * The lower jaw mirrors the sweep vertically so its arc bulges downward, which
 * is what keeps the two rows facing each other across the midline gap.
 */
export function getToothTransform(
  meta: ToothMeta,
  layout: "arch" | "row" = "arch",
): ToothTransform {
  const upper = isUpper(meta.fdi);

  if (layout === "row") {
    const x = ROW.startX + meta.index * ROW.step + ROW.step / 2;
    const y = upper ? ROW.upperY : ROW.lowerY;
    return {
      x,
      y,
      angle: upper ? 0 : 180,
      labelX: x,
      labelY: upper ? y - ROW.numberOffset : y + ROW.numberOffset,
    };
  }

  const { cx, upperCy, lowerCy, radiusX, radiusY, numberOffset } = ARCH;
  // Placed by distance along the curve, not by angle — see buildArcTable.
  const theta = thetaAtArcLength(SLOTS.centers[meta.index]);

  const cosT = Math.cos(toRad(theta));
  const sinT = Math.sin(toRad(theta));

  const cy = upper ? upperCy : lowerCy;
  // Upper jaw uses sin as-is (arc opens upward); the lower jaw flips it.
  const sinJaw = upper ? sinT : -sinT;

  const x = cx + radiusX * cosT;
  const y = cy + radiusY * sinJaw;

  const normalDeg = (Math.atan2(sinJaw / radiusY, cosT / radiusX) * 180) / Math.PI;
  const angle = normalDeg + 90;

  // Labels ride the same ray, pushed further out, but stay upright.
  const labelX = cx + (radiusX + numberOffset) * cosT;
  const labelY = cy + (radiusY + numberOffset) * sinJaw;

  return { x, y, angle, labelX, labelY };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tooth
// ─────────────────────────────────────────────────────────────────────────────

interface ToothProps {
  meta: ToothMeta;
  transform: ToothTransform;
  status?: ToothStatusDef;
  statusId?: string;
  selected: boolean;
  disabled: boolean;
  showNumber: boolean;
  labels: Record<string, string>;
  /** Mount stagger order. */
  order: number;
  reduceMotion: boolean;
  onClick?: DentalChartProps["onToothClick"];
  onHover?: DentalChartProps["onToothHover"];
}

function Tooth({
  meta, transform, status, statusId, selected, disabled,
  showNumber, labels, order, reduceMotion, onClick, onHover,
}: ToothProps) {
  const groupRef = useRef<SVGGElement>(null);
  const [hovered, setHovered] = useState(false);

  const shape = SHAPES[meta.type];
  const size = TOOTH_SIZE[meta.type];
  const isMissing = statusId === "missing";

  const fill = status?.color ?? NEUTRAL_FILL;
  const stroke = status?.strokeColor ?? NEUTRAL_STROKE;
  const typeLabel = labels[meta.type] ?? meta.type;
  const statusLabel = status?.label;

  const title = [
    `${labels.tooth ?? "Tish"} ${meta.fdi}`,
    typeLabel,
    statusLabel,
  ].filter(Boolean).join(" · ");

  function emitClick(event: React.MouseEvent | React.KeyboardEvent) {
    if (disabled || !groupRef.current) return;
    onClick?.(meta.fdi, event, groupRef.current);
  }

  function handleKeyDown(event: React.KeyboardEvent<SVGGElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    emitClick(event);
  }

  const interactive = !disabled;
  const scale = reduceMotion ? 1 : hovered && interactive ? 1.06 : 1;

  return (
    <motion.g
      ref={groupRef}
      data-fdi={meta.fdi}
      data-status={statusId ?? "none"}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={`${labels.tooth ?? "Tish"} ${meta.fdi}, ${typeLabel}${statusLabel ? `, ${statusLabel}` : ""}`}
      aria-disabled={disabled || undefined}
      className={cn(
        "outline-none [&:focus-visible_.tooth-focus]:opacity-100",
        interactive ? "cursor-pointer" : "cursor-default",
      )}
      style={{ transformOrigin: `${transform.x}px ${transform.y}px` }}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
      animate={{ opacity: disabled ? 0.45 : 1, scale }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 320, damping: 24, delay: order * 0.015 }
      }
      onMouseEnter={() => { if (interactive) { setHovered(true); onHover?.(meta.fdi); } }}
      onMouseLeave={() => { setHovered(false); onHover?.(null); }}
      onClick={emitClick}
      onKeyDown={handleKeyDown}
    >
      <title>{title}</title>

      <g transform={`translate(${transform.x} ${transform.y}) rotate(${transform.angle})`}>
        {/* Selection ring — soft pulse behind the crown. */}
        {selected && (
          <motion.ellipse
            rx={size.width / 2 + 3}
            ry={size.height / 2 + 3}
            fill="none"
            stroke="#2563EB"
            strokeWidth={2}
            animate={reduceMotion ? { opacity: 0.9 } : { opacity: [0.35, 1, 0.35] }}
            transition={reduceMotion ? { duration: 0 } : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Focus ring, revealed by :focus-visible on the group. */}
        <ellipse
          className="tooth-focus pointer-events-none opacity-0"
          rx={size.width / 2 + 2.5}
          ry={size.height / 2 + 2.5}
          fill="none"
          stroke="#0F172A"
          strokeWidth={1.5}
          strokeDasharray="3 2"
        />

        {/* Crown. The key makes a status change remount the shape, which
            replays the colour transition plus a short pop. */}
        <motion.path
          key={statusId ?? "none"}
          d={shape.outline}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.2}
          strokeLinejoin="round"
          opacity={isMissing ? 0.4 : 1}
          initial={reduceMotion ? false : { scale: 1 }}
          animate={reduceMotion ? {} : { scale: [1, 1.12, 1] }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.3, ease: "easeOut" }}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        />

        {/* Optional pattern overlay for statuses that ask for one. */}
        {status?.pattern && status.pattern !== "none" && !isMissing && (
          <path
            d={shape.outline}
            fill={`url(#tooth-pattern-${status.pattern})`}
            stroke="none"
            pointerEvents="none"
          />
        )}

        {/* Surface fissures. */}
        <path
          d={shape.detail}
          fill="none"
          stroke={stroke}
          strokeWidth={0.9}
          strokeLinecap="round"
          opacity={isMissing ? 0.25 : 0.55}
          pointerEvents="none"
        />

        {/* Missing teeth get a cross through the crown. */}
        {isMissing && (
          <path
            d={`M ${-size.width / 2} ${-size.height / 2} L ${size.width / 2} ${size.height / 2}
                M ${size.width / 2} ${-size.height / 2} L ${-size.width / 2} ${size.height / 2}`}
            stroke="#64748B"
            strokeWidth={1.6}
            strokeLinecap="round"
            fill="none"
            pointerEvents="none"
          />
        )}

        {/* Invisible hit area — guarantees a comfortable touch target. */}
        <rect
          x={-Math.max(size.width, MIN_HIT_SIZE) / 2}
          y={-Math.max(size.height, MIN_HIT_SIZE) / 2}
          width={Math.max(size.width, MIN_HIT_SIZE)}
          height={Math.max(size.height, MIN_HIT_SIZE)}
          fill="transparent"
        />
      </g>

      {/* FDI number — outside the arc and always upright. */}
      {showNumber && (
        <text
          x={transform.labelX}
          y={transform.labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="pointer-events-none select-none fill-slate-500 text-[9px] tabular-nums dark:fill-slate-400"
        >
          {meta.fdi}
        </text>
      )}
    </motion.g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chart
// ─────────────────────────────────────────────────────────────────────────────

export function DentalChartV2({
  values = {},
  statuses = DEFAULT_STATUSES,
  layout = "arch",
  selectedTeeth = [],
  disabledTeeth = [],
  hiddenTeeth = [],
  showNumbers = true,
  showQuadrantLines = true,
  maxWidth = 440,
  labels,
  onToothClick,
  onToothHover,
  className,
}: DentalChartProps) {
  const prefersReduced = useReducedMotion();
  const reduceMotion = prefersReduced ?? false;

  const statusById = useMemo(
    () => new Map(statuses.map((s) => [s.id, s])),
    [statuses],
  );
  const mergedLabels = useMemo(
    () => ({ ...DEFAULT_LABELS, ...labels }),
    [labels],
  );

  const selected = useMemo(() => new Set(selectedTeeth), [selectedTeeth]);
  const disabled = useMemo(() => new Set(disabledTeeth), [disabledTeeth]);
  const hidden = useMemo(() => new Set(hiddenTeeth), [hiddenTeeth]);

  const visibleTeeth = useMemo(
    () => TEETH.filter((meta) => !hidden.has(meta.fdi)),
    [hidden],
  );

  const midX = layout === "arch" ? ARCH.cx : ROW.startX + (TEETH_PER_ROW * ROW.step) / 2;

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
      // Fluid down to small screens, but capped and centred on large ones.
      className={cn("mx-auto block h-auto w-full select-none", className)}
      style={maxWidth === "none" ? undefined : { maxWidth }}
      role="group"
      aria-label={`${mergedLabels.upper} / ${mergedLabels.lower}`}
    >
      <defs>
        <pattern id="tooth-pattern-hatch" width={4} height={4} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={4} stroke="rgba(15,23,42,0.35)" strokeWidth={1} />
        </pattern>
        <pattern id="tooth-pattern-cross" width={4} height={4} patternUnits="userSpaceOnUse">
          <path d="M 0 0 L 4 4 M 4 0 L 0 4" stroke="rgba(15,23,42,0.3)" strokeWidth={0.8} fill="none" />
        </pattern>
        <pattern id="tooth-pattern-dots" width={4} height={4} patternUnits="userSpaceOnUse">
          <circle cx={2} cy={2} r={0.9} fill="rgba(15,23,42,0.35)" />
        </pattern>
      </defs>

      {/* Quadrant separators: vertical midline plus the inter-jaw line. */}
      {showQuadrantLines && (
        <g stroke="currentColor" className="text-slate-300 dark:text-slate-600" strokeWidth={1} strokeDasharray="3 4">
          <line x1={midX} y1={8} x2={midX} y2={VIEWBOX.height - 8} />
          <line x1={14} y1={VIEWBOX.height / 2} x2={VIEWBOX.width - 14} y2={VIEWBOX.height / 2} opacity={0.6} />
        </g>
      )}

      {visibleTeeth.map((meta, order) => {
        const statusId = values[meta.fdi];
        return (
          <Tooth
            key={meta.fdi}
            meta={meta}
            transform={getToothTransform(meta, layout)}
            status={statusId ? statusById.get(statusId) : undefined}
            statusId={statusId}
            selected={selected.has(meta.fdi)}
            disabled={disabled.has(meta.fdi)}
            showNumber={showNumbers}
            labels={mergedLabels}
            order={order}
            reduceMotion={reduceMotion}
            onClick={onToothClick}
            onHover={onToothHover}
          />
        );
      })}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Install
 *   npm install motion
 *   (lucide-react, tailwind and the `cn` helper are already in this project)
 *
 * Usage
 *   import { DentalChartV2, DEFAULT_STATUSES } from "@/components/DentalChartV2";
 *
 *   export default function App() {
 *     const [selected, setSelected] = useState<string[]>([]);
 *     return (
 *       <div className="mx-auto max-w-xl p-6">
 *         <DentalChartV2
 *           values={{ "16": "caries", "24": "filling", "36": "crown", "46": "missing" }}
 *           maxWidth={440}   // default; use "none" to fill the container
 *           selectedTeeth={selected}
 *           hiddenTeeth={["18", "28", "38", "48"]}
 *           onToothClick={(fdi, _event, element) => {
 *             // `element` is the tooth's <g> node — anchor a popover to it here.
 *             console.log(fdi, element.getBoundingClientRect());
 *             setSelected((prev) => (prev.includes(fdi) ? prev.filter((f) => f !== fdi) : [...prev, fdi]));
 *           }}
 *         />
 *       </div>
 *     );
 *   }
 * ───────────────────────────────────────────────────────────────────────────── */
