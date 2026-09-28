/** A placeholder block shaped like content that is still loading. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`rounded-sm bg-surface-2 ${className}`} />;
}
