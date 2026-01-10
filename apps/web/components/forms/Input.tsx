'use client';

import { useState, useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, id, ...props }: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={inputId}
        className={`text-sm font-semibold transition-colors duration-200 ${
          isFocused
            ? 'text-[var(--color-primary)]'
            : error
            ? 'text-[var(--color-danger)]'
            : 'text-[var(--color-text-main)]'
        }`}
      >
        {label}
      </label>
      <div className="relative">
        <input
          {...props}
          id={inputId}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          className={`w-full rounded-[var(--radius-md)] border-2 bg-white px-4 py-3 text-sm text-[var(--color-text-main)] transition-all duration-200 placeholder:text-[var(--color-text-secondary)] focus:outline-none ${
            error
              ? 'border-[var(--color-danger)] shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
              : isFocused
              ? 'border-[var(--color-primary)] shadow-[var(--shadow-md)]'
              : 'border-[var(--color-border)] shadow-[var(--shadow-sm)] hover:border-[color:rgba(245,61,45,0.3)]'
          }`}
        />
      </div>
      {error && (
        <div
          id={errorId}
          role="alert"
          className="flex items-center gap-1 animate-[slideDown_0.2s_ease-out]"
        >
          <svg
            className="h-4 w-4 flex-shrink-0 text-[var(--color-danger)]"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-sm font-medium text-[var(--color-danger)]">{error}</span>
        </div>
      )}
    </div>
  );
}
