"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { ApiError, errorMessage } from "@/lib/api";
import { joinPath, normalizeRoomCode, ROOM_CODE_PATTERN } from "@/lib/room-code";
import { studentApi } from "@/lib/student-api";
import { readSession } from "@/lib/student-session";

export function JoinForm() {
  const router = useRouter();
  const inputId = useId();
  const errorId = useId();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = normalizeRoomCode(value);
    if (!code) {
      setError("Enter the code your teacher shared.");
      return;
    }
    if (!ROOM_CODE_PATTERN.test(code)) {
      setError("Room codes are 4 to 10 letters and numbers. Check the code on the board.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const room = await studentApi.room(code);
      // A locked room still lets back in the students who already joined it (PRD R4).
      if (room.is_locked && !readSession(room.code)) {
        setError("This room is locked. Ask your teacher to unlock it.");
        setPending(false);
        return;
      }
      router.push(joinPath(room.code));
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 404
          ? `We couldn't find room ${code}. Check the code on the board.`
          : errorMessage(err),
      );
      setPending(false);
    }
  }

  return (
    <form id="join" onSubmit={(event) => void onSubmit(event)} noValidate className="scroll-mt-24">
      <label htmlFor={inputId} className="text-label font-medium text-text">
        Joining a class? Enter your room code
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id={inputId}
          name="code"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError(null);
          }}
          placeholder="MAT 7B2"
          maxLength={14}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          inputMode="text"
          enterKeyHint="go"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={
            "h-12 w-full min-w-0 rounded-md border bg-surface px-4 font-mono text-h3 font-semibold uppercase " +
            "tracking-code text-text transition-colors duration-150 ease-brand placeholder:font-normal " +
            "placeholder:text-text-subtle hover:border-text-subtle sm:max-w-60 " +
            (error ? "border-danger" : "border-border-strong")
          }
        />
        <Button type="submit" variant="secondary" size="lg" disabled={pending}>
          {pending ? "Joining…" : "Join room"}
          {!pending && <ArrowRight className="size-5" strokeWidth={1.75} aria-hidden />}
        </Button>
      </div>
      <div aria-live="polite" className="mt-2 text-body">
        {error ? (
          <p id={errorId} className="text-danger">
            {error}
          </p>
        ) : (
          <p className="text-text-subtle">No account or app needed. Just the code and your name.</p>
        )}
      </div>
    </form>
  );
}
