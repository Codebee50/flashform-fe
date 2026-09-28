"use client";

import { ArrowLeft, Check, CircleAlert, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGuardedNavigate, useUnsavedChanges } from "@/components/teacher/leave-guard";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, errorMessage } from "@/lib/api";
import {
  blankDraft,
  blankQuestion,
  draftErrors,
  draftFromQuiz,
  errorCount,
  fingerprint,
  MAX_QUESTIONS,
  noErrors,
  TITLE_MAX,
  toRequest,
  type Draft,
  type DraftErrors,
  type DraftQuestion,
} from "@/lib/quiz-draft";
import { quizzesApi } from "@/lib/quizzes-api";
import type { QuestionType } from "@/lib/types";
import { QUESTION_TYPES, QuestionCard, type Cleared } from "./question-card";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; draft: Draft }
  | { status: "not_found" }
  | { status: "error"; message: string };

/**
 * After "Save" on a new quiz, the editor moves to the quiz's own URL. The draft travels
 * with it, so the page doesn't reload what it just saved and the teacher's place is kept.
 */
const handoffs = new Map<number, { draft: Draft; saved: string }>();

/** The quiz editor (PRD Q1–Q7): `/teacher/quizzes/new` when `id` is null. */
export function QuizEditor({ id }: { id: string | null }) {
  const quizId = id !== null && /^\d+$/.test(id) ? Number(id) : null;
  const [handoff] = useState(() => (quizId === null ? undefined : handoffs.get(quizId)));
  const [state, setState] = useState<LoadState>(() => {
    if (id === null) return { status: "ready", draft: blankDraft() };
    if (quizId === null) return { status: "not_found" };
    return handoff ? { status: "ready", draft: handoff.draft } : { status: "loading" };
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (quizId !== null) handoffs.delete(quizId);
  }, [quizId]);

  useEffect(() => {
    if (quizId === null || handoff) return;
    const controller = new AbortController();
    quizzesApi.get(quizId, { signal: controller.signal }).then(
      (quiz) => setState({ status: "ready", draft: draftFromQuiz(quiz) }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setState(
          error instanceof ApiError && error.status === 404
            ? { status: "not_found" }
            : { status: "error", message: errorMessage(error) },
        );
      },
    );
    return () => controller.abort();
  }, [quizId, handoff, attempt]);

  if (state.status === "loading") return <EditorSkeleton />;

  if (state.status === "not_found") {
    return (
      <div className={pageClass}>
        <BackLink />
        <div className="mt-6 max-w-md">
          <h1 className="text-h2 font-semibold text-text">Quiz not found</h1>
          <p className="mt-2 text-body-lg text-text-muted">
            It may have been deleted, or the link is wrong.
          </p>
          <ButtonLink href="/teacher" variant="secondary" className="mt-5">
            Go to your quizzes
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className={pageClass}>
        <BackLink />
        <div className="mt-6 max-w-md">
          <Notice tone="danger">Couldn&apos;t load this quiz. {state.message}</Notice>
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
      </div>
    );
  }

  return (
    <Editor
      quizId={quizId}
      initial={state.draft}
      saved={handoff?.saved ?? (quizId === null ? null : fingerprint(state.draft))}
      created={Boolean(handoff)}
    />
  );
}

const pageClass = "mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8";

function Editor({
  quizId,
  initial,
  saved: initialSaved,
  created,
}: {
  /** null: not created yet. */
  quizId: number | null;
  initial: Draft;
  /** Fingerprint of what the server has; null for a new quiz. */
  saved: string | null;
  /** Just created by this editor on /new: show it as saved. */
  created: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(initialSaved);
  // Compared with a blank quiz while it's new, so an untouched new quiz isn't "unsaved".
  const [pristine] = useState(() => fingerprint(initial));
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(created);
  const [errors, setErrors] = useState<DraftErrors>(noErrors);
  /** The quiz was deleted (another tab) while being edited: the next Save creates it again. */
  const [gone, setGone] = useState(false);
  const [newQuestion, setNewQuestion] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const current = useMemo(() => fingerprint(draft), [draft]);
  const dirty = current !== (saved ?? pristine);
  const isNew = quizId === null;
  useUnsavedChanges(dirty);

  const rootRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef(draft);
  const focusAfter = useRef<"first-error" | { key: string; target: string } | null>(null);
  const saveRef = useRef<() => void>(() => {});

  useEffect(() => {
    draftRef.current = draft;
  });

  // Focus moves after the render that needs it: to the first invalid field after a failed
  // save, or back to the control that was used after a question moved or went away.
  useEffect(() => {
    const request = focusAfter.current;
    if (!request) return;
    focusAfter.current = null;
    if (request === "first-error") {
      focusFirstError();
      return;
    }
    const card = rootRef.current?.querySelector(`[data-question="${request.key}"]`);
    for (const target of request.target.split(",")) {
      const element = card?.querySelector<HTMLButtonElement>(target);
      if (element && !element.disabled) {
        element.focus();
        return;
      }
    }
  });

  function focusFirstError() {
    const field = rootRef.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"], [data-error-anchor]',
    );
    if (!field) return;
    // Centered, so the message under the field shows too.
    field.focus({ preventScroll: true });
    field.scrollIntoView({ block: "center" });
  }

  async function save() {
    if (saving) return;
    const sent = draftRef.current;
    const body = toRequest(sent);
    const create = quizId === null || gone;
    setSaving(true);
    setErrors(noErrors());
    try {
      if (quizId === null || gone) {
        // Not idempotent: a retry after a lost response makes a second quiz, which the
        // teacher can delete from the dashboard. Rare enough not to guard against.
        const quiz = await quizzesApi.create(body);
        setSaved(JSON.stringify(body));
        handoffs.set(quiz.id, { draft: draftRef.current, saved: JSON.stringify(body) });
        router.replace(`/teacher/quizzes/${quiz.id}`);
        return;
      }
      await quizzesApi.update(quizId, body);
      setSaved(JSON.stringify(body));
      setJustSaved(true);
      setAnnouncement("Quiz saved.");
    } catch (error) {
      if (error instanceof ApiError && error.code === "validation_error") {
        const found = draftErrors(error, sent);
        setErrors(found);
        focusAfter.current = "first-error";
        setAnnouncement(`Couldn't save. ${describeProblems(found, sent)}`);
      } else if (!create && error instanceof ApiError && error.status === 404) {
        setGone(true);
      } else {
        setErrors({ ...noErrors(), form: errorMessage(error) });
        setAnnouncement(`Couldn't save. ${errorMessage(error)}`);
      }
    }
    setSaving(false);
  }

  useEffect(() => {
    saveRef.current = () => void save();
  });

  // Ctrl+S / Cmd+S saves instead of downloading the page.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function clearErrors(key: string, cleared: Cleared) {
    setErrors((current) => {
      const slots = current.byQuestion[key];
      if (!slots) return current;
      const rest = cleared === "*" ? {} : { ...slots };
      if (cleared !== "*") for (const slot of cleared) delete rest[slot];
      return { ...current, byQuestion: { ...current.byQuestion, [key]: rest } };
    });
  }

  function updateQuestion(
    key: string,
    update: (question: DraftQuestion) => DraftQuestion,
    cleared: Cleared,
  ) {
    setDraft((d) => ({
      ...d,
      questions: d.questions.map((q) => (q.key === key ? update(q) : q)),
    }));
    clearErrors(key, cleared);
    setJustSaved(false);
  }

  function addQuestion(type: QuestionType) {
    const question = blankQuestion(type);
    setDraft((d) => ({ ...d, questions: [...d.questions, question] }));
    setErrors((e) => ({ ...e, questions: undefined }));
    setNewQuestion(question.key);
    setJustSaved(false);
  }

  function moveQuestion(key: string, delta: -1 | 1) {
    const from = draft.questions.findIndex((q) => q.key === key);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= draft.questions.length) return;
    setDraft((d) => {
      const questions = [...d.questions];
      [questions[from], questions[to]] = [questions[to], questions[from]];
      return { ...d, questions };
    });
    const [here, other] = delta < 0 ? ["up", "down"] : ["down", "up"];
    focusAfter.current = { key, target: `[data-action="${here}"],[data-action="${other}"]` };
    setAnnouncement(`Question moved to position ${to + 1} of ${draft.questions.length}.`);
    setJustSaved(false);
  }

  function removeQuestion(key: string) {
    const index = draft.questions.findIndex((q) => q.key === key);
    if (index < 0 || draft.questions.length <= 1) return;
    const neighbour = draft.questions[index + 1] ?? draft.questions[index - 1];
    setDraft((d) => ({ ...d, questions: d.questions.filter((q) => q.key !== key) }));
    clearErrors(key, "*");
    focusAfter.current = { key: neighbour.key, target: "select" };
    setAnnouncement(`Question ${index + 1} deleted.`);
    setJustSaved(false);
  }

  const problems = errorCount(errors);
  const count = draft.questions.length;

  return (
    // Scroll margin keeps focused fields clear of the sticky save bar.
    <div ref={rootRef} className="[&_*]:scroll-mt-20">
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div className="sticky top-0 z-10 border-b border-border bg-bg">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <BackLink />
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <SaveStatus
              saving={saving}
              failed={problems > 0 || Boolean(errors.form)}
              dirty={dirty}
              justSaved={justSaved && !dirty}
            />
            <Button onClick={() => void save()} disabled={saving || (!dirty && !isNew && !gone)}>
              {saving ? "Saving…" : gone ? "Save as new quiz" : isNew ? "Create quiz" : "Save quiz"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-6 pb-24 sm:px-6 sm:pt-8">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-h2 font-semibold text-text">{isNew ? "New quiz" : "Edit quiz"}</h1>
          <p className="shrink-0 text-body text-text-subtle">
            <span className="font-mono tabular-nums">{count}</span>{" "}
            {count === 1 ? "question" : "questions"}
          </p>
        </div>

        <div className="mt-4 space-y-3 empty:hidden">
          {gone && (
            <Notice tone="warning">
              This quiz was deleted, maybe in another tab. Your changes are still here: save them
              as a new quiz, or leave to discard them.
            </Notice>
          )}
          {errors.form && <Notice tone="danger">Couldn&apos;t save. {errors.form}</Notice>}
          {problems > 0 && (
            <Notice tone="danger">
              Couldn&apos;t save. {describeProblems(errors, draft)}{" "}
              <button
                type="button"
                className="font-medium text-text underline underline-offset-2"
                onClick={focusFirstError}
              >
                Show the first one
              </button>
            </Notice>
          )}
        </div>

        <Field
          label="Title"
          className="mt-6"
          inputClassName="font-medium"
          value={draft.title}
          onChange={(event) => {
            const title = event.target.value;
            setDraft((d) => ({ ...d, title }));
            setErrors((e) => ({ ...e, title: undefined }));
            setJustSaved(false);
          }}
          maxLength={TITLE_MAX}
          placeholder="Cell biology check-in"
          autoComplete="off"
          error={errors.title}
          autoFocus={isNew}
          required
        />

        <div className="mt-8 space-y-4">
          {draft.questions.map((question, index) => (
            <QuestionCard
              key={question.key}
              question={question}
              index={index}
              total={count}
              errors={errors.byQuestion[question.key] ?? {}}
              autoFocus={question.key === newQuestion}
              onChange={(update, cleared) => updateQuestion(question.key, update, cleared)}
              onMove={(delta) => moveQuestion(question.key, delta)}
              onRemove={() => removeQuestion(question.key)}
            />
          ))}
        </div>

        {errors.questions && (
          <p
            tabIndex={-1}
            data-error-anchor
            className="mt-4 flex items-center gap-2 text-body text-danger"
          >
            <CircleAlert className="size-4 shrink-0" strokeWidth={2} aria-hidden />
            {errors.questions}
          </p>
        )}

        <div className="mt-4 rounded-lg border border-dashed border-border-strong px-4 py-4 sm:px-5">
          {count >= MAX_QUESTIONS ? (
            <p className="text-body text-text-muted">
              A quiz can have up to {MAX_QUESTIONS} questions.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-2 text-body font-medium text-text-muted">Add a question</span>
              {QUESTION_TYPES.map((type) => (
                <Button key={type.value} variant="secondary" onClick={() => addQuestion(type.value)}>
                  <Plus className="size-4" strokeWidth={1.75} aria-hidden />
                  {type.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** "Fix 3 fields in questions 2 and 5." */
function describeProblems(errors: DraftErrors, draft: Draft) {
  const count = errorCount(errors);
  const numbers = draft.questions
    .map((q, index) => (Object.keys(errors.byQuestion[q.key] ?? {}).length ? index + 1 : null))
    .filter((n): n is number => n !== null);
  const fields = count === 1 ? "1 field" : `${count} fields`;
  const where = [
    errors.title ? "the title" : null,
    numbers.length === 1
      ? `question ${numbers[0]}`
      : numbers.length > 1
        ? `questions ${listOf(numbers.map(String))}`
        : null,
  ].filter(Boolean);
  return where.length ? `Fix ${fields} in ${listOf(where as string[])}.` : `Fix ${fields}.`;
}

function listOf(items: string[]) {
  if (items.length <= 2) return items.join(" and ");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function SaveStatus({
  saving,
  failed,
  dirty,
  justSaved,
}: {
  saving: boolean;
  failed: boolean;
  dirty: boolean;
  justSaved: boolean;
}) {
  const base = "hidden items-center gap-1.5 text-body sm:flex";
  if (saving) return null;
  if (failed) {
    return (
      <p className={`${base} text-danger`}>
        <CircleAlert className="size-4" strokeWidth={2} aria-hidden />
        Not saved
      </p>
    );
  }
  if (dirty) {
    return (
      <p className={`${base} text-text-muted`}>
        <span aria-hidden className="size-2 rounded-full bg-warning" />
        Unsaved changes
      </p>
    );
  }
  if (justSaved) {
    return (
      <p className={`${base} text-success motion-safe:animate-fade-in`}>
        <Check className="size-4" strokeWidth={2} aria-hidden />
        Saved
      </p>
    );
  }
  return null;
}

function BackLink() {
  const guardNavigate = useGuardedNavigate();
  return (
    <ButtonLink
      href="/teacher"
      variant="ghost"
      className="-ml-3"
      onNavigate={guardNavigate("/teacher")}
    >
      <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
      Dashboard
    </ButtonLink>
  );
}

function EditorSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading quiz">
      <div className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <BackLink />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      <div className={pageClass}>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-8 h-3 w-12" />
        <Skeleton className="mt-2 h-11 w-full" />
        {[0, 1].map((card) => (
          <div key={card} className="mt-8 rounded-lg border border-border bg-surface">
            <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-8 w-32" />
            </div>
            <div className="space-y-3 p-5">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
