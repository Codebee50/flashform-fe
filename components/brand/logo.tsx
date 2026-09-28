type SymbolProps = {
  className?: string;
  title?: string;
};

/**
 * The Flashform symbol: a rounded square in Signal Orange with an "F" built
 * from three rounded bars, the arms reading as two results bars (BRAND.md §3).
 */
export function LogoSymbol({ className = "size-6", title }: SymbolProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <rect width="32" height="32" rx="9" className="fill-logo" />
      <rect x="10" y="7.5" width="4.5" height="17" rx="2.25" className="fill-logo-fg" />
      <rect x="10" y="7.5" width="13" height="4.5" rx="2.25" className="fill-logo-fg" />
      <rect x="10" y="13.75" width="8.5" height="4.5" rx="2.25" className="fill-logo-fg" />
    </svg>
  );
}

/** Full lockup. Symbol 26px, wordmark 20px: cap height ≈ 55%, gap ≈ 40%. */
export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoSymbol className="size-6.5 shrink-0" />
      <span className="text-h3 font-semibold tracking-wordmark text-text">Flashform</span>
    </span>
  );
}
