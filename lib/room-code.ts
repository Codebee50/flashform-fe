// Room codes (PRD R1, docs/api/rooms.md): 4–10 characters, A–Z and 0–9, stored uppercase.

export const ROOM_CODE_PATTERN = /^[A-Z0-9]{4,10}$/;

/** What people type is case-insensitive and may contain spaces ("mat 7b2"). */
export function normalizeRoomCode(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

/** Splits a code into two groups for display, so `MAT7B2` reads as `MAT 7B2`. */
export function groupRoomCode(code: string): string[] {
  if (code.length < 4) return [code];
  const middle = Math.ceil(code.length / 2);
  return [code.slice(0, middle), code.slice(middle)];
}

/** Where students join a room (PRD §10). */
export function joinPath(code: string): string {
  return `/r/${code}`;
}
