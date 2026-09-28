import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { LiveActivitySummary, Room } from "@/lib/types";

/** "Quick question" or the quiz's title, for a room's live activity. */
export function describeActivity(activity: LiveActivitySummary): string {
  return activity.type === "QUIZ" ? activity.quiz_title || "Quiz" : "Quick question";
}

/** Live and locked badges for a room (PRD R2, R4). Renders nothing for an idle room. */
export function RoomStatus({ room }: { room: Room }) {
  return (
    <>
      {room.live_activity && (
        <Badge tone="success">
          <span className="size-1.5 rounded-full bg-current" aria-hidden />
          Live
        </Badge>
      )}
      {room.is_locked && (
        <Badge tone="warning">
          <Lock className="size-3" strokeWidth={2} aria-hidden />
          Locked
        </Badge>
      )}
    </>
  );
}
