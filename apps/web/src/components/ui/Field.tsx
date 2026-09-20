import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

// NFR-09: every control has a real <label>, an error message wired through aria-describedby,
// and the global focus ring. The gradient-on-focus border is the Aceternity "signup form" look.

type FieldShellProps = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (ids: { id: string; describedBy: string | undefined }) => ReactNode;
  className?: string;
};

export function FieldShell({ label, hint, error, required, children, className }: FieldShellProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
        {required && (
          <span aria-hidden className="ml-0.5 text-accent">
            *
          </span>
        )}
      </label>
      {children({ id, describedBy })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-fg-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass = (invalid?: boolean) =>
  cn(
    'h-10 w-full rounded-lg border bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle transition-colors',
    'border-border hover:border-border-strong focus:border-accent',
    invalid && 'border-danger focus:border-danger',
  );

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & { label: string; hint?: string; error?: string };
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, hint, error, required, className, ...rest }, ref) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} className={className}>
      {({ id, describedBy }) => (
        <input ref={ref} id={id} aria-invalid={!!error || undefined} aria-describedby={describedBy} required={required} className={inputClass(!!error)} {...rest} />
      )}
    </FieldShell>
  );
});

type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & { label: string; hint?: string; error?: string };
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ label, hint, error, required, className, rows = 4, ...rest }, ref) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} className={className}>
      {({ id, describedBy }) => (
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          required={required}
          className={cn(inputClass(!!error), 'h-auto py-2 leading-relaxed')}
          {...rest}
        />
      )}
    </FieldShell>
  );
});

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & { label: string; hint?: string; error?: string; options: { value: string; label: string }[]; placeholder?: string };
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ label, hint, error, required, className, options, placeholder, ...rest }, ref) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} className={className}>
      {({ id, describedBy }) => (
        <select ref={ref} id={id} aria-invalid={!!error || undefined} aria-describedby={describedBy} required={required} className={cn(inputClass(!!error), 'appearance-none')} {...rest}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
});
