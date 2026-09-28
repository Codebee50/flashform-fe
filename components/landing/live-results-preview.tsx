"use client";

import { Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { answerStyles, type AnswerLetter } from "@/components/ui/answer-colors";
import { DEMO_QUESTION, DEMO_ROOM, groupCode } from "./demo-data";

/* A fixed, seeded arrival order so server and client render the same thing. */
function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const rand = seeded(11);
const ORDER: AnswerLetter[] = DEMO_QUESTION.choices.flatMap((c) =>
  Array<AnswerLetter>(c.votes).fill(c.letter),
);
for (let i = ORDER.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [ORDER[i], ORDER[j]] = [ORDER[j], ORDER[i]];
}
/* A few early answers, a burst, then the stragglers. */
const DELAYS = ORDER.map((_, i) => {
  const jitter = Math.round(rand() * 60);
  if (i < 4) return 220 + jitter;
  if (i > ORDER.length - 5) return 320 + jitter * 2;
  return 40 + jitter;
});

const TOTAL = ORDER.length;
const START_DELAY = 700;

export function LiveResultsPreview() {
  const [arrived, setArrived] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let i = 0;
    let timer: number;
    const tick = () => {
      i += 1;
      setArrived(i);
      if (i < TOTAL) timer = window.setTimeout(tick, DELAYS[i]);
    };
    timer = window.setTimeout(
      reduceMotion ? () => setArrived(TOTAL) : tick,
      reduceMotion ? 0 : START_DELAY,
    );
    return () => window.clearTimeout(timer);
  }, []);

  const counts = useMemo(() => {
    const tally: Partial<Record<AnswerLetter, number>> = {};
    for (const letter of ORDER.slice(0, arrived)) tally[letter] = (tally[letter] ?? 0) + 1;
    return tally;
  }, [arrived]);

  const correct = counts[DEMO_QUESTION.correct] ?? 0;
  const percentCorrect = arrived ? Math.round((correct / arrived) * 100) : null;
  const finalPercent = Math.round(
    ((DEMO_QUESTION.choices.find((c) => c.letter === DEMO_QUESTION.correct)?.votes ?? 0) / TOTAL) *
      100,
  );

  return (
    <figure className="overflow-hidden rounded-lg border border-border bg-surface">
      <figcaption className="sr-only">
        Example of the teacher’s live results: {TOTAL} of {DEMO_ROOM.joined} students answered,{" "}
        {finalPercent}% correct.
      </figcaption>

      <div aria-hidden className="flex h-12 items-center justify-between border-b border-border px-4 sm:px-6">
        <span className="text-label font-medium text-text">{DEMO_ROOM.name}</span>
        <span className="inline-flex items-center gap-2 text-caption font-medium text-text-muted">
          <span className="size-2 rounded-full bg-success" />
          Live
        </span>
      </div>

      <div aria-hidden className="p-4 sm:p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-caption text-text-subtle">Room code</p>
            <p className="mt-1 font-mono text-h2 font-semibold tracking-code text-text sm:text-h1">
              {groupCode(DEMO_ROOM.code)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-caption text-text-subtle">Answered</p>
            <p className="mt-1 font-mono text-h2 font-semibold tabular-nums text-text sm:text-h1">
              {arrived}
              <span className="text-text-subtle">/{DEMO_ROOM.joined}</span>
            </p>
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-5">
          <p className="text-caption text-text-subtle">
            Question {DEMO_QUESTION.number} of {DEMO_QUESTION.total}
          </p>
          <p className="mt-1 text-body-lg font-medium text-text">{DEMO_QUESTION.prompt}</p>

          <ul className="mt-5 space-y-4">
            {DEMO_QUESTION.choices.map((choice) => {
              const votes = counts[choice.letter] ?? 0;
              const isCorrect = choice.letter === DEMO_QUESTION.correct;
              const style = answerStyles[choice.letter];
              return (
                <li key={choice.letter} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3">
                  <span
                    className={`flex size-6 items-center justify-center rounded-sm text-label font-semibold ${style.badge}`}
                  >
                    {choice.letter}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-body text-text">{choice.text}</span>
                      {isCorrect && (
                        <span className="inline-flex shrink-0 items-center gap-1 text-caption font-medium text-success">
                          <Check className="size-3.5" strokeWidth={2.25} />
                          Correct
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className={`h-full rounded-full transition-transform duration-220 ease-brand ${style.bar}`}
                        style={{ transform: `translateX(${(votes / DEMO_ROOM.joined - 1) * 100}%)` }}
                      />
                    </div>
                  </div>
                  <span className="w-8 self-end text-right font-mono text-body-lg font-medium tabular-nums text-text">
                    {votes}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-caption">
          <span className="text-text-muted">
            <span className="font-mono font-medium tabular-nums text-text">
              {percentCorrect === null ? "–" : `${percentCorrect}%`}
            </span>{" "}
            correct
          </span>
          <span className="text-text-subtle">Updates as answers arrive</span>
        </div>
      </div>
    </figure>
  );
}
