import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

const variants: Record<Variant, string> = {
  // Accent gradient with a soft glow on hover (Aceternity look), readable text (NFR-09).
  primary:
    'bg-gradient-to-r from-accent via-accent-2 to-accent-3 text-neutral-950 font-semibold shadow-[0_0_0_1px_rgb(255_255_255/0.08)] hover:shadow-[0_0_24px_-4px_var(--color-accent)] hover:brightness-110',
  secondary: 'border border-border-strong bg-surface-2 text-fg hover:bg-white/10',
  ghost: 'text-fg-muted hover:bg-white/5 hover:text-fg',
  danger: 'bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25',
};
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading = false, disabled, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg transition-[background,box-shadow,filter] duration-200 disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading && <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
});
