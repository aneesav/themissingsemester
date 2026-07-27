/** Primer brand mark: the 5'→ bars from the logo. */
export function BrandMark({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-label="Primer logo" role="img">
      <text x="1" y="10" fontSize="10" fontWeight="700" fill="currentColor" fontFamily="Inter, sans-serif">
        5'
      </text>
      <rect x="1" y="14" width="30" height="6" rx="1" fill="#FBD84A" />
      <rect x="1" y="23" width="19" height="6" rx="1" fill="#00B44B" />
    </svg>
  );
}

export function BrandWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-sans font-bold tracking-[0.25em] uppercase ${className}`}>
      Primer
    </span>
  );
}
