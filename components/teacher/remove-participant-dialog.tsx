"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogActions } from "@/components/ui/dialog";
import { Notice } from "@/components/ui/notice";
import { activitiesApi } from "@/lib/activities-api";
import { ApiError, errorMessage } from "@/lib/api";

/**
 * "Remove Grace?" (PRD L5). The student goes back to the join screen and drops out of this
 * activity's results. They can join again unless the room is locked, so say so.
 */
export function RemoveParticipantDialog({
  activityId,
  participantId,
  name,
  roomLocked,
  onRemoved,
  onClose,
}: {
  activityId: number;
  participantId: string;
  /** As the table shows it, so hidden names stay hidden on a projector. */
  name: string;
  roomLocked: boolean;
  /** After the removal, or when they were already gone: refetch the state. */
  onRemoved: () => void;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setPending(true);
    setError(null);
    try {
      await activitiesApi.removeParticipant(activityId, participantId);
      onRemoved();
    } catch (err) {
      // Already gone from this activity (or the activity is): the screen is out of date.
      if (err instanceof ApiError && err.status === 404) {
        onRemoved();
        return;
      }
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <Dialog
      title={`Remove ${name}?`}
      description={
        <>
          They go back to the join screen and drop out of this activity&apos;s results.{" "}
          {roomLocked
            ? "The room is locked, so they can't join again until you unlock it."
            : "They can join again with the code. Lock the room first to keep them out."}
        </>
      }
      onClose={onClose}
      busy={pending}
    >
      {error && <Notice tone="danger">Couldn&apos;t remove them. {error}</Notice>}
      <DialogActions>
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button variant="danger" onClick={() => void remove()} disabled={pending}>
          {pending ? "Removing…" : "Remove student"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
