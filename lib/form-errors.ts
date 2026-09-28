import { ApiError, errorMessage } from "./api";

export type FormErrors<F extends string> = {
  fields: Partial<Record<F, string>>;
  form: string | null;
};

/**
 * Splits an API error into messages under each known input (`fields[name][0]`) and one
 * message for the whole form (anything that doesn't belong to a visible input).
 */
export function toFormErrors<F extends string>(
  error: unknown,
  fieldNames: readonly F[],
): FormErrors<F> {
  if (!(error instanceof ApiError) || error.code !== "validation_error") {
    return { fields: {}, form: errorMessage(error) };
  }
  const fields: Partial<Record<F, string>> = {};
  const other: string[] = [];
  for (const [name, messages] of Object.entries(error.fields)) {
    if ((fieldNames as readonly string[]).includes(name)) fields[name as F] = messages[0];
    else other.push(...messages);
  }
  const matched = Object.keys(fields).length > 0;
  return { fields, form: other[0] ?? (matched ? null : errorMessage(error)) };
}
