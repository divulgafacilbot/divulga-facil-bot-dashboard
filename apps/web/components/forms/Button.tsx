'use client';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  loading,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] px-6 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

  const variants = {
    primary:
      "bg-[var(--color-primary)] text-white shadow-[var(--shadow-primary)] hover:bg-[var(--color-primary-hover)] hover:shadow-[var(--shadow-primary-lg)] hover:-translate-y-0.5",
    secondary:
      "bg-gradient-secondary text-white shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] hover:-translate-y-0.5",
    ghost:
      "border-2 border-[var(--color-border)] bg-white text-[var(--color-text-main)] hover:border-[var(--color-primary)] hover:bg-[rgba(245,61,45,0.05)] hover:shadow-[var(--shadow-sm)]",
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${baseClasses} ${variants[variant]} ${
        loading ? "cursor-wait" : ""
      } ${className ?? ""}`}
    >
      {loading && (
        <svg
          className="h-5 w-5 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
