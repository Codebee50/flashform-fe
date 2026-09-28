const STATS = [
  { value: "50", label: "students per room, all answering in the same few seconds" },
  { value: "<1s", label: "from a student’s tap to the bar on your screen" },
  { value: "0", label: "answers dropped. A slow save retries until it lands." },
];

const GUARANTEES = [
  {
    title: "Refresh-proof",
    body: "A student can reload, close the tab, or lock their phone. They come back to the same question with their answer still there.",
  },
  {
    title: "Rides out Wi-Fi drops",
    body: "Phones reconnect on their own, spaced out so a whole class coming back online doesn’t pile onto the server at once.",
  },
  {
    title: "Works on strict school networks",
    body: "If live connections are blocked, Flashform quietly checks for updates every few seconds instead. Slower, never stuck.",
  },
  {
    title: "Saved means saved",
    body: "Every answer is written down before a student sees “Saved”. If the connection is slow, they see “Retrying…”, not silence.",
  },
];

export function Reliability() {
  return (
    <section
      id="reliability"
      aria-labelledby="reliability-title"
      className="scroll-mt-4 border-t border-border bg-surface"
    >
      <div className="mx-auto max-w-page px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <h2 id="reliability-title" className="text-h1 font-semibold text-balance text-text">
              Built for the second everyone joins.
            </h2>
            <p className="mt-4 max-w-prose text-body-lg text-text-muted">
              Forty phones hitting the same room at once is the normal case in a classroom, not an
              edge case. Flashform is designed around that moment, so you never have to wonder
              whether an answer counted.
            </p>
          </div>

          <dl className="grid gap-px self-end overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 lg:col-span-7">
            {STATS.map((stat) => (
              <div key={stat.value} className="flex flex-col gap-2 bg-surface p-5 sm:p-6">
                <dt className="order-2 text-body text-text-muted">{stat.label}</dt>
                <dd className="order-1 font-mono text-display-sm font-semibold tabular-nums text-text sm:text-display">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <ul className="mt-16 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {GUARANTEES.map((item) => (
            <li key={item.title} className="border-t border-border-strong pt-5">
              <h3 className="text-body-lg font-semibold text-text">{item.title}</h3>
              <p className="mt-2 text-body text-text-muted">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
