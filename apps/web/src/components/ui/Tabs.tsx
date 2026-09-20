import { useId, type KeyboardEvent } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/cn';

// Docker Desktop style in-page tabs with the Aceternity sliding highlight. Keyboard: arrow
// keys move between tabs, Home/End jump. The active tab is the only one in the tab order.
export type TabItem<K extends string> = { key: K; label: string; count?: number };

export function Tabs<K extends string>({ tabs, value, onChange, className }: { tabs: TabItem<K>[]; value: K; onChange: (k: K) => void; className?: string }) {
  const id = useId();
  const reduce = useReducedMotion();

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tabs.length - 1;
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = index === last ? 0 : index + 1;
    if (e.key === 'ArrowLeft') next = index === 0 ? last : index - 1;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = last;
    if (next === null) return;
    e.preventDefault();
    onChange(tabs[next]!.key);
    document.getElementById(`${id}-tab-${tabs[next]!.key}`)?.focus();
  };

  return (
    <div role="tablist" aria-orientation="horizontal" className={cn('flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1', className)}>
      {tabs.map((t, i) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            id={`${id}-tab-${t.key}`}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.key)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn('relative shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors', active ? 'text-fg' : 'text-fg-muted hover:text-fg')}
          >
            {active && (
              <motion.span
                layoutId={`${id}-highlight`}
                aria-hidden
                className="absolute inset-0 rounded-md bg-white/[0.08] shadow-[inset_0_-2px_0_0_var(--color-accent)]"
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {t.label}
              {t.count !== undefined && <span className={cn('rounded-full px-1.5 text-[11px] leading-4', active ? 'bg-accent/20 text-accent' : 'bg-white/10 text-fg-muted')}>{t.count}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
