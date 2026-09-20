import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';

const tones: Record<Tone, string> = {
  neutral: 'border-border bg-surface-2 text-fg-muted',
  info: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
  success: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  warning: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  danger: 'border-red-400/30 bg-red-400/10 text-red-200',
  accent: 'border-violet-400/30 bg-violet-400/10 text-violet-200',
};

// Docker Desktop style status chip: dot + short label.
export function Badge({ tone = 'neutral', dot = true, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap', tones[tone], className)}>
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
