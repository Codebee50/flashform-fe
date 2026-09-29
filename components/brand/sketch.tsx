/**
 * Shared pieces for the pencil-style classroom drawings (auth pages, landing page).
 * Lines use the neutral tokens so the drawings follow light and dark mode.
 */

export const INK = "stroke-text-muted";

/** An outlined tube (arm, leg): a wide ink stroke under a narrower fill stroke. */
export function Tube({ d, fill = "stroke-surface" }: { d: string; fill?: string }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} className={INK} strokeWidth={12.5} />
      <path d={d} className={fill} strokeWidth={9} />
    </g>
  );
}

/** A small displacement filter that gives strokes a hand-drawn wobble. */
export function PencilFilter({ id }: { id: string }) {
  return (
    <filter id={id} x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={7} />
      <feDisplacementMap in="SourceGraphic" scale={2.2} />
    </filter>
  );
}
