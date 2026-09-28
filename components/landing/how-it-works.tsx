import { StudentPreview } from "./student-preview";

const STEPS = [
  {
    title: "Create a room",
    body: "Name it after your class and get a short code like MAT 7B2. Codes skip look-alike characters, so nobody in the back row mixes up 0 and O.",
  },
  {
    title: "Students join with the code",
    body: "They open Flashform on a phone or laptop, type the code and their name, and they’re in. No student accounts, nothing to install.",
  },
  {
    title: "Ask it your way",
    body: "Ask a quick question out loud, or run a saved quiz at your pace or theirs. Multiple choice, true or false, and short answer.",
  },
  {
    title: "Watch, then keep the results",
    body: "Answers fill in live as they arrive. Hide names before you project. After class, download every response as a CSV.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-title"
      className="scroll-mt-4 border-t border-border"
    >
      <div className="mx-auto grid max-w-page gap-12 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:px-8 lg:py-24">
        <div className="lg:col-span-7">
          <h2 id="how-title" className="text-h1 font-semibold text-balance text-text">
            Nothing to install. Nothing to explain.
          </h2>
          <p className="mt-4 max-w-prose text-body-lg text-text-muted">
            Your class is answering in the time it takes to write a code on the board.
          </p>

          <ol className="mt-10 border-t border-border">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="grid grid-cols-[2.5rem_1fr] gap-x-4 border-b border-border py-6 sm:grid-cols-[3rem_1fr]"
              >
                <span className="pt-0.5 font-mono text-body tabular-nums text-text-subtle">
                  0{i + 1}
                </span>
                <div>
                  <h3 className="text-body-lg font-semibold text-text">{step.title}</h3>
                  <p className="mt-1 max-w-prose text-body-lg text-text-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-8">
            <p className="mb-4 text-center text-body text-text-subtle">
              What students see. Tap an answer to try it.
            </p>
            <StudentPreview />
          </div>
        </div>
      </div>
    </section>
  );
}
