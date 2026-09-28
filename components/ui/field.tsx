import { useId, type ComponentProps, type ReactNode } from "react";

/** The box of a text input or textarea. For inputs that bring their own label. */
export function inputStyles(error?: boolean) {
  return (
    "w-full rounded-md border bg-surface px-3 text-body-lg text-text " +
    "transition-colors duration-150 ease-brand placeholder:text-text-subtle " +
    "hover:border-text-subtle disabled:opacity-60 " +
    (error ? "border-danger" : "border-border-strong")
  );
}

type FieldProps = Omit<ComponentProps<"input">, "id"> & {
  label: string;
  error?: string | null;
  hint?: string;
  /** Rendered at the right of the label row, e.g. a "Forgot password?" link. */
  labelAction?: ReactNode;
  /** Extra classes for the input itself (`className` styles the wrapper). */
  inputClassName?: string;
};

export function Field({
  label,
  error,
  hint,
  labelAction,
  className = "",
  inputClassName = "",
  ...props
}: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error || hint;

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-label font-medium text-text">
          {label}
        </label>
        {labelAction}
      </div>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={`mt-1.5 h-11 ${inputStyles(Boolean(error))} ${inputClassName}`}
        {...props}
      />
      {message && (
        <p
          id={messageId}
          className={`mt-1.5 text-body ${error ? "text-danger" : "text-text-subtle"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}

type TextAreaFieldProps = Omit<ComponentProps<"textarea">, "id"> & {
  label: string;
  error?: string | null;
  hint?: string;
  labelAction?: ReactNode;
};

export function TextAreaField({
  label,
  error,
  hint,
  labelAction,
  className = "",
  rows = 2,
  ...props
}: TextAreaFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error || hint;

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-label font-medium text-text">
          {label}
        </label>
        {labelAction}
      </div>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={`mt-1.5 block resize-y py-2.5 ${inputStyles(Boolean(error))}`}
        {...props}
      />
      {message && (
        <p
          id={messageId}
          className={`mt-1.5 text-body ${error ? "text-danger" : "text-text-subtle"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
