import { INK, PencilFilter, Tube } from "@/components/brand/sketch";
import { RevealOnView } from "./reveal-on-view";

/*
 * Landing page scene: a side view of a classroom. The room code is on the board,
 * a dot lights up for each student who has joined, and answers drift from the
 * desks up to the board. A companion to the auth-page drawing, not a copy of it.
 */

/** The bottom edge of the drawing, which lands on the footer border. */
const FLOOR = 400;
const SEATS = 28;
const JOINED = 26;

type Point = [number, number];

/** The path the answers travel along, from above the desks to the board. */
const STREAM: [Point, Point, Point, Point] = [
  [1040, 170],
  [900, 64],
  [640, 60],
  [412, 138],
];

function pointOnStream(t: number): Point {
  const u = 1 - t;
  const [p0, p1, p2, p3] = STREAM;
  const at = (i: 0 | 1) =>
    u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i];
  return [at(0), at(1)];
}

const CHIPS = [
  { t: 0.1, letter: "B", color: "fill-answer-b", fg: "fill-answer-b-fg" },
  { t: 0.34, letter: "A", color: "fill-answer-a", fg: "fill-answer-a-fg" },
  { t: 0.57, letter: "B", color: "fill-answer-b", fg: "fill-answer-b-fg" },
  { t: 0.79, letter: "C", color: "fill-answer-c", fg: "fill-answer-c-fg" },
];

/**
 * A student in profile, seated at a desk and facing the board on the left.
 * `x` is the hip; everything else hangs off it.
 */
function SideStudent({ x, hair, raised = false }: { x: number; hair: string; raised?: boolean }) {
  return (
    <g>
      {/* Chair */}
      <path d={`M${x + 30} 332 V266`} className={INK} strokeWidth={3} />
      <path d={`M${x - 8} 334 V${FLOOR} M${x + 28} 334 V${FLOOR}`} className={INK} />

      {/* Desk */}
      <path d={`M${x - 66} 303 V${FLOOR}`} className={INK} />
      <rect x={x - 102} y={296} width={72} height={7} rx={2} className={`fill-surface ${INK}`} />

      {/* Legs and shoes */}
      <Tube d={`M${x + 8} 322 L${x - 38} 324 L${x - 42} 394`} fill="stroke-border" />
      <path d={`M${x - 36} ${FLOOR - 2} H${x - 58}`} className={INK} strokeWidth={4} />
      <path d={`M${x - 12} 331 H${x + 32}`} className={INK} strokeWidth={3} />

      {/* Body and head */}
      <path
        d={`M${x - 6} 258 C${x - 12} 284 ${x - 8} 312 ${x - 2} 330 L${x + 22} 330 C${x + 24} 300 ${x + 20} 272 ${x + 12} 256 Z`}
        className={`fill-surface ${INK}`}
      />
      <circle cx={x + 2} cy={236} r={17} className={`fill-surface ${INK}`} />
      <path
        d={`M${x - 14} 230 C${x - 12} 214 ${x + 10} 212 ${x + 18} 226 C${x + 22} 236 ${x + 18} 248 ${x + 14} 254 C${x + 12} 242 ${x + 4} 232 ${x - 14} 230 Z`}
        className={`${hair} ${INK}`}
      />
      <circle cx={x - 7} cy={237} r={1.5} className="fill-text-muted" />

      {/* Arm to the phone on the desk */}
      <Tube d={`M${x + 4} 266 L${x - 16} 296 L${x - 40} 284`} />
      <rect
        x={x - 52}
        y={266}
        width={6}
        height={20}
        rx={2}
        transform={`rotate(-24 ${x - 49} 276)`}
        className={`fill-text-muted ${INK}`}
      />
      <circle cx={x - 43} cy={282} r={5} className={`fill-surface ${INK}`} />

      {raised && (
        <>
          <Tube d={`M${x + 8} 264 L${x + 4} 218 L${x - 2} 180`} />
          <circle cx={x - 3} cy={173} r={6} className={`fill-surface ${INK}`} />
        </>
      )}
    </g>
  );
}

function Teacher() {
  return (
    <g>
      <Tube d="M492 300 L488 394" fill="stroke-border" />
      <Tube d="M506 300 L514 394" fill="stroke-border" />
      <path d="M478 398 H496 M508 398 H528" className={INK} strokeWidth={4} />

      {/* Back arm, opening toward the board */}
      <Tube d="M486 232 L462 258 L438 246" fill="stroke-accent-subtle" />
      <circle cx="433" cy="243" r="5.5" className={`fill-surface ${INK}`} />

      <path
        d="M478 222 C472 250 476 284 482 304 L518 304 C522 284 522 250 514 222 C506 214 486 214 478 222 Z"
        className={`fill-accent-subtle ${INK}`}
      />
      <path d="M496 218 V300" className={INK} />

      <circle cx="500" cy="196" r="19" className={`fill-surface ${INK}`} />
      <path
        d="M481 196 C479 176 496 169 510 174 C517 177 520 182 519 186 C508 183 497 186 491 196 C490 204 487 210 484 212 Z"
        className={`fill-text-muted ${INK}`}
      />
      <circle cx="510" cy="196" r="5.5" className={`fill-none ${INK}`} />
      <path d="M504 195 H499" className={INK} />
      <path d="M509 207 Q513 209 516 206" className={`fill-none ${INK}`} />

      {/* Front arm, holding a tablet */}
      <Tube d="M508 232 L516 270 L540 262" fill="stroke-accent-subtle" />
      <rect
        x="536"
        y="236"
        width="8"
        height="36"
        rx="2"
        transform="rotate(14 540 254)"
        className={`fill-surface ${INK}`}
      />
      <circle cx="542" cy="262" r="5.5" className={`fill-surface ${INK}`} />
    </g>
  );
}

function ClassroomDrawing({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 40 1200 360"
      className={className}
      aria-hidden
      focusable="false"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <PencilFilter id="classroom-scene-pencil" />
      </defs>

      <g filter="url(#classroom-scene-pencil)">
        {/* Wall clock */}
        <circle cx="1120" cy="86" r="24" className={`fill-surface ${INK}`} />
        <path d="M1120 86 V70 M1120 86 L1131 92" className={INK} strokeWidth={2.5} />

        {/* Board */}
        <rect x="60" y="56" width="340" height="212" rx="8" className={`fill-surface ${INK}`} />
        <rect x="84" y="268" width="292" height="6" rx="3" className={`fill-surface-2 ${INK}`} />
        <rect x="320" y="262" width="24" height="6" rx="3" className="fill-accent" />

        <Teacher />
        <SideStudent x={712} hair="fill-text-muted" />
        <SideStudent x={862} hair="fill-border-strong" raised />
        <SideStudent x={1012} hair="fill-text-subtle" />
        <SideStudent x={1150} hair="fill-text-muted" />

        <path
          d={`M${STREAM[0].join(" ")} C${STREAM.slice(1).map((p) => p.join(" ")).join(" ")}`}
          className="fill-none stroke-text-subtle"
          strokeDasharray="2 7"
        />
      </g>

      {/* Board contents, kept off the wobble filter so the type stays crisp */}
      <text x="84" y="90" className="fill-text-muted font-sans" fontSize={14}>
        Join with code
      </text>
      <text
        x="84"
        y="152"
        className="fill-text font-mono font-semibold"
        fontSize={54}
        letterSpacing="0.08em"
      >
        MAT
        <tspan dx="22">7B2</tspan>
      </text>
      {Array.from({ length: SEATS }, (_, i) => {
        const cx = 92 + (i % 14) * 20;
        const cy = 190 + Math.floor(i / 14) * 20;
        return i < JOINED ? (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={6}
            className="sketch-dot fill-text-muted"
            style={{ animationDelay: `${200 + i * 45}ms` }}
          />
        ) : (
          <circle key={i} cx={cx} cy={cy} r={5.5} className="fill-none stroke-border-strong" />
        );
      })}
      <text
        x="84"
        y="252"
        className="fill-text-muted font-mono tabular-nums"
        fontSize={13}
      >
        {JOINED} of {SEATS} joined
      </text>

      {CHIPS.map((chip) => {
        const [cx, cy] = pointOnStream(chip.t);
        return (
          <g key={chip.t}>
            <circle cx={cx} cy={cy} r={11} className={chip.color} />
            <text
              x={cx}
              y={cy + 3.5}
              textAnchor="middle"
              className={`${chip.fg} font-mono font-semibold`}
              fontSize={11}
            >
              {chip.letter}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Decorative only, so no heading. The drawing has no bottom padding and no floor line:
 * everyone stands on the footer's top border.
 */
export function ClassroomScene() {
  return (
    <div className="border-t border-border bg-surface">
      <RevealOnView className="mx-auto max-w-page px-4 pt-16 sm:px-6 lg:px-8 lg:pt-24">
        <ClassroomDrawing className="block h-auto w-full" />
      </RevealOnView>
    </div>
  );
}
