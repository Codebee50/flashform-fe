import { useId, type ReactNode } from "react";

/** A row of radio buttons that look like a segmented control. */
export function Segmented<T extends string | number>({
  label,
  name,
  value,
  onChange,
  options,
  hint,
  error,
}: {
  label: string;
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: ReactNode }[];
  hint?: ReactNode;
  error?: string | null;
}) {
  const messageId = useId();
  const message = error || hint;

  return (
    <fieldset aria-describedby={message ? messageId : undefined}>
      <legend className="text-label font-medium text-text">{label}</legend>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={
              "inline-flex h-10 min-w-12 cursor-pointer items-center justify-center rounded-md border px-3 " +
              "text-body font-medium transition-colors duration-150 ease-brand " +
              "bg-surface text-text-muted hover:bg-surface-2 hover:text-text " +
              "has-checked:border-accent has-checked:bg-accent-subtle has-checked:text-text " +
              "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent " +
              (error ? "border-danger" : "border-border-strong")
            }
          >
            <input
              type="radio"
              name={name}
              className="sr-only"
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
      {message && (
        <p
          id={messageId}
          className={`mt-1.5 text-body ${error ? "text-danger" : "text-text-subtle"}`}
        >
          {message}
        </p>
      )}
    </fieldset>
  );
}
