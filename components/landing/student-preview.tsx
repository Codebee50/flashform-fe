"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LogoSymbol } from "@/components/brand/logo";
import { answerStyles, type AnswerLetter } from "@/components/ui/answer-colors";
import { DEMO_QUESTION, DEMO_ROOM, groupCode } from "./demo-data";

type SaveState = "idle" | "saving" | "saved";

/** An interactive copy of the student answer screen (mobile-first, BRAND.md §4, §8). */
export function StudentPreview() {
  const [selected, setSelected] = useState<AnswerLetter>("B");
  const [save, setSave] = useState<SaveState>("saved");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function choose(letter: AnswerLetter) {
    setSelected(letter);
    setSave("saving");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSave("saved"), 450);
  }

  return (
    <div className="mx-auto w-full max-w-phone rounded-xl border border-border bg-surface">
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <span className="inline-flex items-center gap-2">
          <LogoSymbol className="size-5" />
          <span className="font-mono text-body-lg font-semibold tracking-code text-text">
            {groupCode(DEMO_ROOM.code)}
          </span>
        </span>
        <span className="text-body text-text-muted">Maya R.</span>
      </div>

      <div className="px-4 pt-5 pb-4">
        <p className="text-body-lg text-text-muted">
          Question {DEMO_QUESTION.number} of {DEMO_QUESTION.total}
        </p>
        <p className="mt-1 text-h3 font-semibold text-text">{DEMO_QUESTION.prompt}</p>

        <div role="radiogroup" aria-label="Answer choices" className="mt-5 space-y-2.5">
          {DEMO_QUESTION.choices.map((choice) => {
            const isSelected = choice.letter === selected;
            const style = answerStyles[choice.letter];
            return (
              <button
                key={choice.letter}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => choose(choice.letter)}
                className={
                  "flex min-h-13 w-full items-center gap-3 rounded-md border border-l-4 border-border px-3 text-left " +
                  "transition-[background-color,box-shadow,transform] duration-150 ease-brand motion-safe:active:translate-y-0.5 " +
                  `${style.edge} ` +
                  (isSelected ? `ring-1 ring-inset ${style.selected}` : "bg-surface hover:bg-surface-2")
                }
              >
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-sm text-body-lg font-semibold ${style.badge}`}
                >
                  {choice.letter}
                </span>
                <span className="text-body-lg text-text">{choice.text}</span>
              </button>
            );
          })}
        </div>

        <p aria-live="polite" className="mt-4 flex h-6 items-center gap-1.5 text-body-lg font-medium">
          {save === "saving" && <span className="text-text-muted">Saving…</span>}
          {save === "saved" && (
            <span className="inline-flex items-center gap-1.5 text-success motion-safe:animate-fade-in">
              <Check className="size-5" strokeWidth={2.25} aria-hidden />
              Saved
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
