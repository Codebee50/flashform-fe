import { groupRoomCode } from "@/lib/room-code";

/**
 * A room code in Geist Mono, uppercase, split into two groups (`MAT 7B2`, BRAND.md §5).
 * The gap is spacing, not a character, so selecting and copying gives the plain code.
 */
export function RoomCode({ code, className = "" }: { code: string; className?: string }) {
  return (
    <span className={`inline-block font-mono whitespace-nowrap uppercase tracking-code ${className}`}>
      {groupRoomCode(code).map((group, index) => (
        // The gap is in em so it scales with whatever size the code is set at.
        <span key={index} className={index > 0 ? "ml-[0.4em]" : undefined}>
          {group}
        </span>
      ))}
    </span>
  );
}
