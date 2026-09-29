/**
 * Decorative pencil drawing for the auth pages: a teacher points at live results
 * on the board while the class answers from their seats and phones. Lines use the
 * neutral tokens; the answer colors on the board are the only color, as in the product.
 */

import { INK, PencilFilter, Tube } from "@/components/brand/sketch";

/** A mid-row student seen from behind, sitting on a chair at the long table. */
function SeatedStudent({ cx, hair }: { cx: number; hair: string }) {
  return (
    <g>
      <path
        d={`M${cx - 26} 444 C${cx - 26} 404 ${cx - 16} 392 ${cx} 392 C${cx + 16} 392 ${cx + 26} 404 ${cx + 26} 444 Z`}
        className={`fill-surface ${INK}`}
      />
      <circle cx={cx - 15} cy={375} r={4} className={`fill-surface ${INK}`} />
      <circle cx={cx + 15} cy={375} r={4} className={`fill-surface ${INK}`} />
      <circle cx={cx} cy={372} r={16} className={`${hair} ${INK}`} />
      <rect x={cx - 25} y={430} width={50} height={24} rx={4} className={`fill-surface-2 ${INK}`} />
      <path d={`M${cx - 20} 454 V504 M${cx + 20} 454 V504`} className={INK} />
    </g>
  );
}

/** A front-row student seen from behind, cropped by the bottom of the drawing. */
function FrontStudent({ cx, hair }: { cx: number; hair: string }) {
  return (
    <g>
      <path
        d={`M${cx - 76} 660 C${cx - 76} 604 ${cx - 58} 574 ${cx} 570 C${cx + 58} 574 ${cx + 76} 604 ${cx + 76} 660 Z`}
        className={`fill-surface ${INK}`}
      />
      <path d={`M${cx - 15} 571 Q${cx} 580 ${cx + 15} 571`} className={`fill-none ${INK}`} />
      <circle cx={cx - 30} cy={532} r={6.5} className={`fill-surface ${INK}`} />
      <circle cx={cx + 30} cy={532} r={6.5} className={`fill-surface ${INK}`} />
      <circle cx={cx} cy={526} r={31} className={`${hair} ${INK}`} />
    </g>
  );
}

const RESULTS = [
  { letter: "A", width: 58, count: 3, color: "fill-answer-a", fg: "fill-answer-a-fg" },
  { letter: "B", width: 176, count: 18, color: "fill-answer-b", fg: "fill-answer-b-fg" },
  { letter: "C", width: 92, count: 5, color: "fill-answer-c", fg: "fill-answer-c-fg" },
  { letter: "D", width: 36, count: 2, color: "fill-answer-d", fg: "fill-answer-d-fg" },
];

export function ClassroomSketch({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 560 640"
      preserveAspectRatio="xMidYMax meet"
      className={className}
      aria-hidden
      focusable="false"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <PencilFilter id="classroom-sketch-pencil" />
        <clipPath id="classroom-sketch-frame">
          <rect width="560" height="640" />
        </clipPath>
      </defs>

      <g clipPath="url(#classroom-sketch-frame)">
        <g filter="url(#classroom-sketch-pencil)">
          {/* Floor */}
          <path d="M24 506 H536" className="stroke-border-strong" />

          {/* Whiteboard */}
          <rect x="170" y="64" width="320" height="196" rx="8" className={`fill-surface ${INK}`} />
          <rect x="192" y="260" width="276" height="6" rx="3" className={`fill-surface-2 ${INK}`} />
          <rect x="426" y="254" width="24" height="6" rx="3" className="fill-accent" />
          <path d="M210 96 H366 M210 113 H306" className="stroke-border-strong" strokeWidth={3.5} />
        </g>

        {/* Results on the board: kept off the wobble filter so the bars stay crisp */}
        {RESULTS.map((row, i) => {
          const y = 146 + i * 26;
          return (
            <g key={row.letter}>
              <circle cx="218" cy={y} r="9" className={row.color} />
              <text
                x="218"
                y={y + 3.5}
                textAnchor="middle"
                className={`${row.fg} font-mono font-semibold`}
                fontSize={10}
              >
                {row.letter}
              </text>
              <rect
                x="234"
                y={y - 6}
                width={row.width}
                height="12"
                rx="6"
                className={`${row.color} sketch-bar`}
                style={{ animationDelay: `${250 + i * 90}ms` }}
              />
              <text
                x={242 + row.width}
                y={y + 4}
                className="fill-text-muted font-mono tabular-nums"
                fontSize={11}
              >
                {row.count}
              </text>
            </g>
          );
        })}
        <path
          d="M446 171 l4.5 4.5 l9 -10"
          className="fill-none stroke-success"
          strokeWidth={2.5}
        />

        <g filter="url(#classroom-sketch-pencil)">
          {/* Teacher, pointing at the board */}
          <path d="M92 410 L86 510 L106 510 L110 446 L114 510 L134 510 L128 410 Z" className={`fill-border ${INK}`} />
          <path d="M80 512 H108 M112 512 H140" className={INK} strokeWidth={3.5} />
          <Tube d="M93 320 C84 350 82 380 86 402" fill="stroke-accent-subtle" />
          <circle cx="86" cy="408" r="6" className={`fill-surface ${INK}`} />
          <path
            d="M90 312 C84 334 86 384 90 414 L130 414 C134 384 136 334 130 312 C122 304 98 304 90 312 Z"
            className={`fill-accent-subtle ${INK}`}
          />
          <path d="M103 306 Q110 314 117 306" className={`fill-none ${INK}`} />
          <Tube d="M127 320 L162 288 L184 244" fill="stroke-accent-subtle" />
          <circle cx="186" cy="238" r="6" className={`fill-surface ${INK}`} />
          <path d="M189 233 L196 223" className={INK} strokeWidth={3} />
          <circle cx="110" cy="282" r="19" className={`fill-surface ${INK}`} />
          <circle cx="92" cy="262" r="8.5" className={`fill-text-muted ${INK}`} />
          <path
            d="M91 284 C87 262 104 254 118 259 C127 262 131 270 129 276 C121 270 106 270 99 277 C98 284 97 292 94 296 Z"
            className={`fill-text-muted ${INK}`}
          />
          <circle cx="120" cy="281" r="1.6" className="fill-text-muted" />
          <path d="M116 290 Q121 293 126 289" className={`fill-none ${INK}`} />

          {/* Long table and the middle row */}
          <path d="M226 454 V504 M494 454 V504" className={INK} />
          <rect x="222" y="404" width="276" height="8" rx="2" className={`fill-surface ${INK}`} />
          <SeatedStudent cx={272} hair="fill-border-strong" />
          <SeatedStudent cx={378} hair="fill-text-muted" />
          <Tube d="M478 402 C484 380 488 362 490 346" />
          <circle cx="491" cy="339" r="6.5" className={`fill-surface ${INK}`} />
          <SeatedStudent cx={462} hair="fill-text-subtle" />

          {/* Front row */}
          <FrontStudent cx={132} hair="fill-text-muted" />
          <FrontStudent cx={380} hair="fill-border-strong" />
          <Tube d="M334 590 C326 570 330 552 342 540" />
          <g transform="rotate(-12 346 516)">
            <rect x="333" y="494" width="26" height="44" rx="5" className={`fill-text-muted ${INK}`} />
            <rect x="336" y="498" width="20" height="34" rx="2.5" className="fill-surface" />
            <circle cx="346" cy="509" r="5" className="fill-answer-b" />
            <path d="M340 520 H352 M340 525 H349" className="stroke-border-strong" />
          </g>
          <circle cx="342" cy="540" r="7" className={`fill-surface ${INK}`} />

          {/* An answer on its way to the board */}
          <path
            d="M338 486 C318 440 314 350 330 282"
            className="fill-none stroke-text-subtle"
            strokeDasharray="2 7"
          />
        </g>
        <circle cx="321" cy="378" r="10" className="fill-answer-b" />
        <text
          x="321"
          y="381.5"
          textAnchor="middle"
          className="fill-answer-b-fg font-mono font-semibold"
          fontSize={10}
        >
          B
        </text>
      </g>
    </svg>
  );
}
