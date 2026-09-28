// Reconnecting WebSocket with a polling fallback: PRD §6 rules 4, 7 and 8, and
// docs/api/websocket.md.
//
// The socket only carries "activity X changed, it is now at version N"; the data always comes
// from the REST state endpoints. So a ReconnectingSocket needs little from its owner: how to
// build the URL (called before every attempt, so a fresh token goes in each time), what to do
// with an event, and how to refetch. It then keeps a socket open for as long as it runs:
// backoff with jitter between attempts, a ping/pong heartbeat, and polling through `refetch`
// while the socket has been down for more than 5 s.
import {
  CLOSE_NOT_FOUND,
  CLOSE_UNAUTHORIZED,
  type ClientMessage,
  type ConnectionStatus,
  type RoomEvent,
  type ServerMessage,
  type StudentEvent,
  type TeacherEvent,
} from "./types";

export const WS_URL = (process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws").replace(
  /\/+$/,
  "",
);

/** A socket URL. `path` is relative to NEXT_PUBLIC_WS_URL; empty params are left out. */
export function wsUrl(path: string, params: Record<string, string | null | undefined> = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  const search = query.toString();
  return `${WS_URL}${path}${search ? `?${search}` : ""}`;
}

const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 15_000;
const BACKOFF_JITTER = 0.3;
/** A connection that stays up this long resets the backoff. */
const STABLE_AFTER_MS = 10_000;
const PING_EVERY_MS = 25_000;
const PONG_TIMEOUT_MS = 10_000;
const POLL_AFTER_MS = 5_000;
const POLL_EVERY_MS = 3_000;

/**
 * Wait before reconnect attempt `attempt` (0-based): 1 s, 2 s, 4 s… capped at 15 s, then
 * ±30 % jitter so a class of phones coming back from a Wi-Fi blip doesn't reconnect in
 * lockstep (PRD §6 rule 7).
 */
export function backoffDelay(attempt: number, random: () => number = Math.random): number {
  const base = Math.min(BACKOFF_BASE_MS * 2 ** Math.min(attempt, 10), BACKOFF_MAX_MS);
  return Math.round(base * (1 - BACKOFF_JITTER + random() * 2 * BACKOFF_JITTER));
}

export const STUDENT_EVENT_TYPES: ReadonlySet<StudentEvent["type"]> = new Set([
  "activity_started",
  "activity_updated",
  "activity_ended",
  "participant_removed",
]);

export const TEACHER_EVENT_TYPES: ReadonlySet<TeacherEvent["type"]> = new Set([
  "participants_changed",
  "responses_updated",
  "activity_updated",
]);

function parseMessage(raw: unknown): ServerMessage | null {
  if (typeof raw !== "string") return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const message = data as Record<string, unknown>;
  if (message.type === "pong") return { type: "pong" };
  if (typeof message.activity_id !== "number" || typeof message.version !== "number") return null;
  if (message.type === "participant_removed" && typeof message.participant_id !== "string") {
    return null;
  }
  return message as RoomEvent;
}

/**
 * How an event relates to the state on screen (PRD §6 rule 4):
 * - `stale`: already seen (version ≤ lastVersion), or about an older activity. Ignore it.
 * - `next`: exactly lastVersion + 1. Do the event's action (for now, always a refetch).
 * - `gap`: changes were missed, a newer activity started, or nothing is loaded yet.
 *   Refetch the full state.
 *
 * Activity ids only grow, so an event for a lower id than the one on screen is a late
 * trailing event for an activity that has since been replaced.
 */
export function classifyEvent(
  event: RoomEvent,
  current: { activityId: number; version: number } | null,
): "stale" | "next" | "gap" {
  if (!current || event.activity_id > current.activityId) return "gap";
  if (event.activity_id < current.activityId || event.version <= current.version) return "stale";
  return event.version === current.version + 1 ? "next" : "gap";
}

export type ReconnectingSocketOptions<E extends RoomEvent> = {
  /** The event types this endpoint sends. Anything else is dropped. */
  eventTypes: ReadonlySet<E["type"]>;
  /** Called before every connect and reconnect. Throwing counts as a failed attempt. */
  getUrl: () => string | Promise<string>;
  onEvent: (event: E) => void;
  onStatus: (status: ConnectionStatus) => void;
  /**
   * Called each time a socket is confirmed open. Events sent while it was down are not
   * replayed, so refetch here.
   */
  onConnected?: () => void;
  /** Called every 3 s once the socket has been down for more than 5 s (PRD §6 rule 8). */
  refetch?: () => void;
  /**
   * The server rejected the credentials (4401). Fix them (refresh the teacher token, drop
   * the student token); resolving reconnects right away, rejecting falls back to backoff.
   * Without this, 4401 is retried with backoff like any other close.
   */
  onUnauthorized?: () => void | Promise<void>;
};

/**
 * A room socket that keeps itself connected until `stop()`. A socket only counts as live
 * once the server has answered a ping: rejected sockets (4401, 4404) are accepted and then
 * closed straight away, and shouldn't flash "Live" or trigger a refetch.
 */
export class ReconnectingSocket<E extends RoomEvent> {
  private readonly options: ReconnectingSocketOptions<E>;
  private socket: WebSocket | null = null;
  private status: ConnectionStatus = "connecting";
  private confirmed = false;
  /** Bumped by every connect and by stop(), so a late callback from an older attempt is ignored. */
  private generation = 0;
  private attempt = 0;
  /** A 4401 was just handled; a second one in a row goes through backoff instead of looping. */
  private reauthorized = false;

  private reconnectTimer: number | undefined;
  private pingTimer: number | undefined;
  private pongTimer: number | undefined;
  private stableTimer: number | undefined;
  private pollDelayTimer: number | undefined;
  private pollTimer: number | undefined;

  constructor(options: ReconnectingSocketOptions<E>) {
    this.options = options;
  }

  start() {
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
    this.startPolling();
    void this.connect();
  }

  stop() {
    this.generation += 1;
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
    window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    this.stopPolling();
    this.dropSocket();
  }

  private async connect() {
    const generation = ++this.generation;
    let url: string;
    try {
      url = await this.options.getUrl();
    } catch {
      if (generation === this.generation) this.retry();
      return;
    }
    if (generation !== this.generation) return;

    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch {
      this.retry();
      return;
    }
    this.socket = socket;
    socket.onopen = () => this.ping();
    socket.onmessage = (event) => this.handleMessage(event.data);
    socket.onclose = (event) => this.handleClose(event.code);
  }

  private retry() {
    const delay = backoffDelay(this.attempt);
    this.attempt += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.connect();
    }, delay);
  }

  private ping() {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify({ type: "ping" } satisfies ClientMessage));
    this.pongTimer ??= window.setTimeout(() => this.handleClose(0), PONG_TIMEOUT_MS);
  }

  private handleMessage(raw: unknown) {
    const message = parseMessage(raw);
    if (!message) return;
    if (message.type === "pong") {
      window.clearTimeout(this.pongTimer);
      this.pongTimer = undefined;
      if (!this.confirmed) this.confirm();
      return;
    }
    if ((this.options.eventTypes as ReadonlySet<string>).has(message.type)) {
      this.options.onEvent(message as E);
    }
  }

  private confirm() {
    this.confirmed = true;
    this.reauthorized = false;
    this.stopPolling();
    this.pingTimer = window.setInterval(() => this.ping(), PING_EVERY_MS);
    this.stableTimer = window.setTimeout(() => {
      this.attempt = 0;
    }, STABLE_AFTER_MS);
    this.setStatus("live");
    this.options.onConnected?.();
  }

  /** The socket closed, or is considered dead (code 0: no pong, or the browser went offline). */
  private handleClose(code: number) {
    this.dropSocket();

    if (code === CLOSE_NOT_FOUND) {
      this.stopPolling();
      this.setStatus("not_found");
      return;
    }

    this.startPolling();
    this.setStatus("reconnecting");

    const { onUnauthorized } = this.options;
    if (code === CLOSE_UNAUTHORIZED && onUnauthorized && !this.reauthorized) {
      // Not a network failure: fix the credentials and reconnect now, without backoff.
      this.reauthorized = true;
      const generation = this.generation;
      Promise.resolve()
        .then(onUnauthorized)
        .then(
          () => {
            if (generation === this.generation) void this.connect();
          },
          () => {
            if (generation === this.generation) this.retry();
          },
        );
      return;
    }

    this.retry();
  }

  /** Forgets the current socket (closing it if needed) and its heartbeat. */
  private dropSocket() {
    const socket = this.socket;
    this.socket = null;
    this.confirmed = false;
    window.clearInterval(this.pingTimer);
    window.clearTimeout(this.pongTimer);
    window.clearTimeout(this.stableTimer);
    this.pingTimer = this.pongTimer = this.stableTimer = undefined;
    if (!socket) return;
    socket.onopen = socket.onmessage = socket.onclose = null;
    if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) {
      socket.close(1000);
    }
  }

  private startPolling() {
    const { refetch } = this.options;
    if (!refetch || this.pollDelayTimer !== undefined || this.pollTimer !== undefined) return;
    this.pollDelayTimer = window.setTimeout(() => {
      this.pollDelayTimer = undefined;
      refetch();
      this.pollTimer = window.setInterval(refetch, POLL_EVERY_MS);
    }, POLL_AFTER_MS);
  }

  private stopPolling() {
    window.clearTimeout(this.pollDelayTimer);
    window.clearInterval(this.pollTimer);
    this.pollDelayTimer = this.pollTimer = undefined;
  }

  private setStatus(status: ConnectionStatus) {
    if (status === this.status) return;
    this.status = status;
    this.options.onStatus(status);
  }

  /** Back online: skip the rest of the backoff wait. */
  private handleOnline = () => {
    if (this.reconnectTimer === undefined) return;
    window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    void this.connect();
  };

  /** The socket won't notice for a while; show "Reconnecting…" and start the clock now. */
  private handleOffline = () => {
    if (this.socket) this.handleClose(0);
  };
}
