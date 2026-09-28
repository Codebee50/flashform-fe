"use client";

import { Copy, ListChecks, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, ButtonLink, IconButton } from "@/components/ui/button";
import { Dialog, DialogActions } from "@/components/ui/dialog";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, errorMessage } from "@/lib/api";
import { quizzesApi } from "@/lib/quizzes-api";
import type { QuizListItem } from "@/lib/types";

type QuizzesState =
  | { status: "loading" }
  | { status: "ready"; quizzes: QuizListItem[] }
  | { status: "error"; message: string };

const editedDate = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

/** The dashboard's quizzes (PRD §10, Q6): open, duplicate and delete. */
export function QuizzesSection() {
  const [state, setState] = useState<QuizzesState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [deleting, setDeleting] = useState<QuizListItem | null>(null);
  const [duplicating, setDuplicating] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    quizzesApi.list({ signal: controller.signal }).then(
      (quizzes) => setState({ status: "ready", quizzes }),
      (error: unknown) => {
        if (!controller.signal.aborted) setState({ status: "error", message: errorMessage(error) });
      },
    );
    return () => controller.abort();
  }, [attempt]);

  const quizzes = state.status === "ready" ? state.quizzes : null;

  function update(change: (quizzes: QuizListItem[]) => QuizListItem[]) {
    setState((current) =>
      current.status === "ready" ? { status: "ready", quizzes: change(current.quizzes) } : current,
    );
  }

  async function duplicate(quiz: QuizListItem) {
    setDuplicating(quiz.id);
    setActionError(null);
    try {
      const copy = await quizzesApi.duplicate(quiz.id);
      update((quizzes) => [copy, ...quizzes]);
      setAnnouncement(`Created ${copy.title}.`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        update((quizzes) => quizzes.filter((q) => q.id !== quiz.id));
        setActionError(`${quiz.title} no longer exists. It may have been deleted in another tab.`);
      } else {
        setActionError(`Couldn't duplicate ${quiz.title}. ${errorMessage(error)}`);
        // Not idempotent: with no response it may have worked, so show what's there
        // before the teacher tries again.
        if (error instanceof ApiError && error.code === "network_error") {
          quizzesApi.list().then(
            (quizzes) => update(() => quizzes),
            () => {},
          );
        }
      }
    }
    setDuplicating(null);
  }

  return (
    <section aria-labelledby="quizzes-heading">
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="quizzes-heading" className="text-h2 font-semibold text-text">
            Quizzes{" "}
            {quizzes && quizzes.length > 0 && (
              <span className="ml-1 font-mono text-h3 font-normal text-text-subtle tabular-nums">
                {quizzes.length}
              </span>
            )}
          </h2>
          <p className="mt-1 text-body text-text-muted">
            Saved question sets you can run in any room.
          </p>
        </div>
        {quizzes && quizzes.length > 0 && (
          <ButtonLink href="/teacher/quizzes/new" className="shrink-0">
            <Plus className="size-4" strokeWidth={1.75} aria-hidden />
            New quiz
          </ButtonLink>
        )}
      </div>

      <div className="mt-6">
        {state.status === "loading" && <QuizListSkeleton />}

        {state.status === "error" && (
          <div className="max-w-md">
            <Notice tone="danger">Couldn&apos;t load your quizzes. {state.message}</Notice>
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => {
                setState({ status: "loading" });
                setAttempt((n) => n + 1);
              }}
            >
              Try again
            </Button>
          </div>
        )}

        {quizzes && quizzes.length === 0 && <EmptyQuizzes />}

        {actionError && (
          <Notice tone="danger" className="mb-4">
            {actionError}
          </Notice>
        )}

        {quizzes && quizzes.length > 0 && (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {quizzes.map((quiz) => (
              <QuizRow
                key={quiz.id}
                quiz={quiz}
                duplicating={duplicating === quiz.id}
                onDuplicate={() => void duplicate(quiz)}
                onDelete={() => {
                  setActionError(null);
                  setDeleting(quiz);
                }}
              />
            ))}
          </ul>
        )}
      </div>

      {deleting && (
        <DeleteQuizDialog
          quiz={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={(id) => {
            update((quizzes) => quizzes.filter((q) => q.id !== id));
            setAnnouncement(`Deleted ${deleting.title}.`);
            setDeleting(null);
          }}
        />
      )}
    </section>
  );
}

function QuizRow({
  quiz,
  duplicating,
  onDuplicate,
  onDelete,
}: {
  quiz: QuizListItem;
  duplicating: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="relative flex items-center gap-3 px-4 py-3.5 transition-colors duration-150 ease-brand hover:bg-surface-2 sm:gap-6 sm:px-5">
      <div className="min-w-0 flex-1">
        {/* The link covers the whole row; the buttons sit above it. */}
        <Link
          href={`/teacher/quizzes/${quiz.id}`}
          className="block truncate rounded-sm text-body-lg font-medium text-text after:absolute after:inset-0"
        >
          {quiz.title}
        </Link>
        <p className="mt-0.5 truncate text-caption text-text-subtle">
          <span className="font-mono tabular-nums">{quiz.question_count}</span>{" "}
          {quiz.question_count === 1 ? "question" : "questions"} · Edited{" "}
          {editedDate.format(new Date(quiz.updated_at))}
        </p>
      </div>
      <div className="relative flex shrink-0 items-center gap-1">
        <IconButton
          label={duplicating ? `Duplicating ${quiz.title}…` : `Duplicate ${quiz.title}`}
          onClick={onDuplicate}
          disabled={duplicating}
          aria-busy={duplicating || undefined}
        >
          <Copy
            className={`size-4 ${duplicating ? "motion-safe:animate-pulse" : ""}`}
            strokeWidth={1.75}
            aria-hidden
          />
        </IconButton>
        <IconButton label={`Delete ${quiz.title}`} onClick={onDelete} className="hover:text-danger">
          <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
        </IconButton>
      </div>
    </li>
  );
}

function DeleteQuizDialog({
  quiz,
  onDeleted,
  onClose,
}: {
  quiz: QuizListItem;
  onDeleted: (id: number) => void;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setPending(true);
    setError(null);
    try {
      await quizzesApi.remove(quiz.id);
      onDeleted(quiz.id);
    } catch (err) {
      // 404: already gone (deleted in another tab, or an earlier attempt went through).
      if (err instanceof ApiError && err.status === 404) {
        onDeleted(quiz.id);
        return;
      }
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <Dialog
      title={`Delete ${quiz.title}?`}
      description="This removes the quiz and its questions. Reports from activities that used it are kept."
      onClose={onClose}
      busy={pending}
    >
      {error && <Notice tone="danger">{error}</Notice>}
      <DialogActions>
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button variant="danger" onClick={() => void remove()} disabled={pending}>
          {pending ? "Deleting…" : "Delete quiz"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function QuizListSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading quizzes"
      className="divide-y divide-border rounded-lg border border-border bg-surface"
    >
      {[0, 1].map((row) => (
        <div key={row} className="flex items-center gap-6 px-4 py-4 sm:px-5">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-56 max-w-full" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

function EmptyQuizzes() {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-border-strong bg-surface px-6 py-14 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-surface-2">
        <ListChecks className="size-5 text-text-subtle" strokeWidth={1.75} aria-hidden />
      </div>
      <p className="mt-4 max-w-prose text-body-lg text-text-muted">
        No quizzes yet. Create one to use in any of your rooms.
      </p>
      <ButtonLink href="/teacher/quizzes/new" className="mt-5">
        <Plus className="size-4" strokeWidth={1.75} aria-hidden />
        New quiz
      </ButtonLink>
    </div>
  );
}
