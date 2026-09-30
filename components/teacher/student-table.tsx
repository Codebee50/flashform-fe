import { Check, EyeOff, UserMinus, UsersRound, X } from "lucide-react";
import { ANSWER_LETTERS } from "@/components/ui/answer-colors";
import { IconButton } from "@/components/ui/button";
import type {
  TeacherParticipant,
  TeacherQuestion,
  TeacherResponse,
  TeacherState,
} from "@/lib/types";

/**
 * Names as the teacher sees them (PRD S2): the second "Grace" to join is "Grace (2)", the
 * third "Grace (3)". Compared trimmed and case-insensitively, in join order.
 */
export function displayNames(participants: TeacherParticipant[]): Map<string, string> {
  const seen = new Map<string, number>();
  const names = new Map<string, string>();
  for (const participant of participants) {
    const key = participant.name.trim().toLocaleLowerCase();
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    names.set(participant.id, count > 1 ? `${participant.name} (${count})` : participant.name);
  }
  return names;
}

/** What the student answered, short enough for a cell, plus the full text for a tooltip. */
function answerText(question: TeacherQuestion, response: TeacherResponse) {
  if (question.type === "SA") return { short: response.text_answer, full: response.text_answer };
  const index = response.choice_index ?? -1;
  const label = question.choices[index] ?? "?";
  if (question.type === "TF") return { short: label, full: label };
  const letter = ANSWER_LETTERS[index] ?? "?";
  return { short: letter, full: label === letter ? letter : `${letter}: ${label}` };
}

/**
 * Everyone's answers (PRD L3): a row per student, a column per question. Green ✓ correct,
 * red ✗ incorrect, grey when the question has no correct answer, blank when unanswered.
 * Student-paced adds each student's progress, and a question's header charts it (PRD L2).
 * Reports (PRD RP2) show the final state with each student's score.
 *
 * For the projector (PRD L4), names can become "Student 1, 2, …" in join order, and results
 * can hide: cells then only say that a student answered, never what or whether it was right.
 */
export function StudentTable({
  state,
  selectedIndex = 0,
  onSelect,
  showScore = false,
  hideNames = false,
  hideResults = false,
  onRemove,
}: {
  state: TeacherState;
  /** Student-paced: the question charted. */
  selectedIndex?: number;
  /** Student-paced: pick the question to chart. Without it the headers are plain. */
  onSelect?: (index: number) => void;
  /** A score column, when some question has a correct answer. */
  showScore?: boolean;
  hideNames?: boolean;
  hideResults?: boolean;
  /** Adds a remove button to each row (PRD L5), called with the name shown in the row. */
  onRemove?: (participant: TeacherParticipant, name: string) => void;
}) {
  const { activity, questions, participants, responses, total_possible: totalPossible } = state;
  const names = displayNames(participants);
  const byCell = new Map(responses.map((r) => [`${r.participant_id}:${r.question_id}`, r]));
  const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });
  // Alphabetical is easiest to scan; the "(2)" suffixes keep join order within a name.
  // Hidden names stay in join order, so the numbers count up and give nothing away.
  const rows = participants.map((participant, joined) => ({
    participant,
    joined,
    name: hideNames
      ? `Student ${joined + 1}`
      : (names.get(participant.id) ?? participant.name),
  }));
  if (!hideNames) {
    rows.sort((a, b) => collator.compare(a.name, b.name) || a.joined - b.joined);
  }
  const studentPaced = activity.type === "QUIZ" && activity.mode === "STUDENT_PACED";
  const pickable = studentPaced && onSelect !== undefined;
  const scored = showScore && totalPossible > 0 && !hideResults;
  const current =
    questions.length <= 1
      ? null
      : studentPaced
        ? pickable
          ? selectedIndex
          : null
        : activity.status === "LIVE" && activity.mode === "TEACHER_PACED"
          ? activity.current_index
          : null;

  return (
    <section
      aria-labelledby="answers-heading"
      className="mt-6 rounded-lg border border-border bg-surface"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 pt-5 sm:px-6">
        <h2 id="answers-heading" className="text-h3 font-semibold text-text">
          Answers
        </h2>
        {hideResults ? (
          <p className="inline-flex items-center gap-1.5 text-caption text-text-muted">
            <EyeOff className="size-3.5" strokeWidth={2} aria-hidden />
            Results hidden. Cells only show who answered.
          </p>
        ) : (
          <Legend />
        )}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center px-4 py-10 text-center">
          <div className="flex size-11 items-center justify-center rounded-full bg-surface-2">
            <UsersRound className="size-5 text-text-subtle" strokeWidth={1.75} aria-hidden />
          </div>
          <p className="mt-4 text-body text-text-muted">
            {activity.status === "LIVE"
              ? "Each student gets a row here as soon as they join."
              : "Nobody joined this activity."}
          </p>
        </div>
      ) : (
        <div className="mt-4 max-h-160 overflow-auto border-t border-border">
          <table className="w-full border-separate border-spacing-0 text-body">
            <caption className="sr-only">
              Each student&apos;s answer to each question
            </caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky top-0 left-0 z-20 border-b border-border bg-surface-2 px-5 py-2.5 text-left text-label font-medium text-text-muted sm:px-6"
                >
                  Student
                </th>
                {scored && (
                  <th
                    scope="col"
                    className="sticky top-0 z-10 border-b border-border bg-surface-2 px-3 py-2.5 text-right text-label font-medium whitespace-nowrap text-text-muted"
                  >
                    Score
                  </th>
                )}
                {studentPaced && (
                  <th
                    scope="col"
                    className="sticky top-0 z-10 border-b border-border bg-surface-2 px-3 py-2.5 text-right text-label font-medium whitespace-nowrap text-text-muted"
                  >
                    Progress
                  </th>
                )}
                {questions.map((question, index) => {
                  const isCurrent = index === current;
                  return (
                    <th
                      key={question.id}
                      scope="col"
                      title={question.prompt || undefined}
                      aria-current={isCurrent && !pickable ? "step" : undefined}
                      className={
                        "sticky top-0 z-10 min-w-16 bg-surface-2 text-left text-label font-medium tabular-nums " +
                        (pickable ? "p-0 " : "px-3 py-2.5 ") +
                        (isCurrent
                          ? "border-b-2 border-accent text-accent"
                          : "border-b border-border text-text-muted")
                      }
                    >
                      {pickable ? (
                        // Picks the question for the chart above.
                        <button
                          type="button"
                          onClick={() => onSelect?.(index)}
                          aria-pressed={isCurrent}
                          className="w-full px-3 py-2.5 text-left transition-colors duration-150 ease-brand hover:bg-surface hover:text-text focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
                        >
                          <span className="sr-only">Show results for question </span>
                          {index + 1}
                        </button>
                      ) : (
                        <>
                          <span className="sr-only">Question </span>
                          {index + 1}
                        </>
                      )}
                    </th>
                  );
                })}
                <th
                  scope="col"
                  aria-hidden
                  className="sticky top-0 z-10 w-full border-b border-border bg-surface-2"
                />
                {onRemove && (
                  <th
                    scope="col"
                    className="sticky top-0 right-0 z-20 border-b border-border bg-surface-2 px-2"
                  >
                    <span className="sr-only">Remove</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ participant, name }) => (
                <tr key={participant.id} className="group">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 max-w-48 truncate border-b border-border bg-surface px-5 py-2 text-left font-medium text-text transition-colors duration-150 group-hover:bg-surface-2 sm:px-6"
                    title={name}
                  >
                    {name}
                  </th>
                  {scored && (
                    <td className="border-b border-border px-3 py-2 text-right font-mono whitespace-nowrap tabular-nums transition-colors duration-150 group-hover:bg-surface-2">
                      <span className="font-medium text-text">{participant.score}</span>
                      <span className="text-text-subtle">
                        <span aria-hidden>/</span>
                        <span className="sr-only"> out of </span>
                        {totalPossible}
                      </span>
                    </td>
                  )}
                  {studentPaced && (
                    <td className="border-b border-border px-3 py-2 text-right whitespace-nowrap transition-colors duration-150 group-hover:bg-surface-2">
                      <Progress participant={participant} />
                    </td>
                  )}
                  {questions.map((question) => {
                    const response = byCell.get(`${participant.id}:${question.id}`);
                    return (
                      <td
                        key={question.id}
                        className="border-b border-border px-3 py-2 transition-colors duration-150 group-hover:bg-surface-2"
                      >
                        {response ? (
                          hideResults ? (
                            <AnsweredCell />
                          ) : (
                            <AnswerCell question={question} response={response} />
                          )
                        ) : (
                          <span className="sr-only">No answer</span>
                        )}
                      </td>
                    );
                  })}
                  <td
                    aria-hidden
                    className="border-b border-border transition-colors duration-150 group-hover:bg-surface-2"
                  />
                  {onRemove && (
                    <td className="sticky right-0 z-10 border-b border-border bg-surface px-2 py-0.5 text-right transition-colors duration-150 group-hover:bg-surface-2">
                      <IconButton
                        label={`Remove ${name}`}
                        onClick={() => onRemove(participant, name)}
                        className="hover:text-danger"
                      >
                        <UserMinus className="size-4" strokeWidth={1.75} aria-hidden />
                      </IconButton>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** "4/10", and a ✓ once they've pressed Finish (PRD L3). */
function Progress({ participant }: { participant: TeacherParticipant }) {
  const { answered_count: answered, question_count: total, finished_at: finished } = participant;
  return (
    <span
      className="inline-flex items-center justify-end gap-1.5 font-mono tabular-nums"
      title={
        finished
          ? `Finished at ${new Date(finished).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
          : undefined
      }
    >
      {finished ? (
        <Check className="size-3.5 text-success" strokeWidth={2.5} aria-hidden />
      ) : null}
      <span className={finished ? "text-text" : "text-text-muted"}>
        <span className="font-medium text-text">{answered}</span>/{total}
      </span>
      {finished && <span className="sr-only">, finished</span>}
    </span>
  );
}

const cellTones = {
  correct: "bg-success-subtle text-success",
  incorrect: "bg-danger-subtle text-danger",
  ungraded: "bg-surface-2 text-text-muted",
};

function AnswerCell({
  question,
  response,
}: {
  question: TeacherQuestion;
  response: TeacherResponse;
}) {
  const { short, full } = answerText(question, response);
  const tone =
    response.is_correct === null ? "ungraded" : response.is_correct ? "correct" : "incorrect";
  const Icon = tone === "correct" ? Check : tone === "incorrect" ? X : null;
  return (
    <span
      title={full}
      className={
        "inline-flex h-7 max-w-40 items-center gap-1 rounded-sm px-2 font-medium " +
        cellTones[tone]
      }
    >
      {Icon && <Icon className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden />}
      <span className="truncate">{short}</span>
      {tone !== "ungraded" && <span className="sr-only">, {tone}</span>}
    </span>
  );
}

/** Hidden results (PRD L4): that they answered, not what, and no right or wrong colour. */
function AnsweredCell() {
  return (
    <span className="inline-flex h-7 items-center rounded-sm bg-surface-2 px-2">
      <span className="size-2 rounded-full bg-text-subtle" aria-hidden />
      <span className="sr-only">Answered</span>
    </span>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-text-muted">
      <li className="inline-flex items-center gap-1.5">
        <Check className="size-3.5 text-success" strokeWidth={2.5} aria-hidden />
        Correct
      </li>
      <li className="inline-flex items-center gap-1.5">
        <X className="size-3.5 text-danger" strokeWidth={2.5} aria-hidden />
        Incorrect
      </li>
      <li className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-border-strong" aria-hidden />
        No correct answer set
      </li>
    </ul>
  );
}
