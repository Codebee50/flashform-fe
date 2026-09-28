"use client";

import { useId, useState, type FormEvent } from "react";
import { ANSWER_LETTERS } from "@/components/ui/answer-colors";
import { Button } from "@/components/ui/button";
import { Dialog, DialogActions } from "@/components/ui/dialog";
import { Notice } from "@/components/ui/notice";
import { Segmented } from "@/components/ui/segmented";
import { activitiesApi } from "@/lib/activities-api";
import { ApiError, errorMessage } from "@/lib/api";
import { roomsApi } from "@/lib/rooms-api";
import type { QuestionType, TeacherState } from "@/lib/types";

const PROMPT_MAX = 1000;
const OPTION_COUNTS = [2, 3, 4, 5, 6] as const;

const TYPES: { value: QuestionType; label: string }[] = [
  { value: "MC", label: "Multiple choice" },
  { value: "TF", label: "True or false" },
  { value: "SA", label: "Short answer" },
];

/**
 * Starts a quick question (PRD QQ1, QQ2, QQ5). When something is already live, the dialog
 * says starting ends it, and the button reads "End current and start": that is the confirm.
 */
export function QuickQuestionDialog({
  roomId,
  liveActivityId,
  onStarted,
  onClose,
}: {
  roomId: number;
  /** The activity running now, if any. Starting ends it. */
  liveActivityId: number | null;
  onStarted: (state: TeacherState) => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<QuestionType>("MC");
  const [optionCount, setOptionCount] = useState(4);
  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const promptId = useId();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const question = {
      type,
      prompt: prompt.trim(),
      ...(type === "MC" ? { choices: ANSWER_LETTERS.slice(0, optionCount) } : {}),
    };
    try {
      onStarted(await activitiesApi.startQuick(roomId, question));
    } catch (err) {
      // Starting isn't idempotent: with no response, it may have worked. Look before
      // offering a retry, so a second click can't end the question it just started.
      if (err instanceof ApiError && err.code === "network_error") {
        const started = await findStarted(roomId, liveActivityId);
        if (started) {
          onStarted(started);
          return;
        }
      }
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <Dialog
      title="Quick question"
      description="Ask out loud or type the question. Students answer on their phones."
      onClose={onClose}
      busy={pending}
    >
      <form onSubmit={(event) => void onSubmit(event)} noValidate className="space-y-5">
        <Segmented label="Type" name="type" value={type} onChange={setType} options={TYPES} />

        {type === "MC" && (
          <Segmented
            label="Options"
            name="options"
            value={optionCount}
            onChange={setOptionCount}
            options={OPTION_COUNTS.map((count) => ({
              value: count,
              label: `A–${ANSWER_LETTERS[count - 1]}`,
            }))}
          />
        )}

        <div>
          <label htmlFor={promptId} className="text-label font-medium text-text">
            Question (optional)
          </label>
          <textarea
            id={promptId}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            maxLength={PROMPT_MAX}
            rows={3}
            placeholder="Which organelle produces most of a cell's ATP?"
            className={
              "mt-1.5 block w-full resize-y rounded-md border border-border-strong bg-surface px-3 py-2.5 " +
              "text-body-lg text-text transition-colors duration-150 ease-brand " +
              "placeholder:text-text-subtle hover:border-text-subtle"
            }
          />
          <p className="mt-1.5 text-body text-text-subtle">
            Leave it empty and students see &ldquo;Answer the question your teacher asked.&rdquo;
          </p>
        </div>

        {liveActivityId !== null && (
          <Notice tone="warning">
            This ends the activity that&apos;s running now. Answers so far are kept.
          </Notice>
        )}
        {error && <Notice tone="danger">{error}</Notice>}

        <DialogActions>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending
              ? "Starting…"
              : liveActivityId !== null
                ? "End current and start"
                : "Start question"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

/** After a start request lost its response: the new activity's state, if it did start. */
async function findStarted(
  roomId: number,
  previousId: number | null,
): Promise<TeacherState | null> {
  try {
    const room = await roomsApi.get(roomId);
    const live = room.live_activity;
    if (!live || live.id === previousId) return null;
    return await activitiesApi.teacherState(live.id);
  } catch {
    return null;
  }
}
