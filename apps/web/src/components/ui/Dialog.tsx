import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { IconX } from '@tabler/icons-react';
import { cn } from '@/lib/cn';

// Accessible modal: focus moves in on open, Escape closes, focus is trapped with a simple
// Tab loop, and the page behind is inert. Motion respects prefers-reduced-motion.
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: 'md' | 'lg';
}) {
  const panel = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(panel.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])') ?? []);
    const first = focusables()[0];
    (first ?? panel.current)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const list = focusables();
        if (!list.length) return;
        const firstEl = list[0]!;
        const lastEl = list[list.length - 1]!;
        if (e.shiftKey && document.activeElement === firstEl) (e.preventDefault(), lastEl.focus());
        else if (!e.shiftKey && document.activeElement === lastEl) (e.preventDefault(), firstEl.focus());
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.button type="button" aria-label="Close dialog" className="absolute inset-0 bg-black/70" initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: 1 }} exit={{ opacity: reduce ? 1 : 0 }} onClick={onClose} />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            aria-describedby={description ? 'dialog-desc' : undefined}
            tabIndex={-1}
            className={cn(
              'relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-card border border-border bg-surface p-5 shadow-[0_0_80px_-20px_var(--color-accent)] sm:rounded-card',
              size === 'md' ? 'sm:max-w-lg' : 'sm:max-w-3xl',
            )}
            initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 24, scale: reduce ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 24, scale: reduce ? 1 : 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 34 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="dialog-title" className="text-lg font-semibold">
                  {title}
                </h2>
                {description && (
                  <p id="dialog-desc" className="mt-1 text-sm text-fg-muted">
                    {description}
                  </p>
                )}
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 shrink-0 place-items-center rounded-lg text-fg-muted hover:bg-white/5 hover:text-fg">
                <IconX aria-hidden className="size-5" />
              </button>
            </div>
            <div className="mt-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
