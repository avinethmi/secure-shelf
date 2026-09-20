import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { IconCircleCheck, IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';
import { cn } from '@/lib/cn';

type Tone = 'success' | 'danger' | 'info';
type Toast = { id: number; tone: Tone; message: string };

const ToastContext = createContext<{ push: (tone: Tone, message: string) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const reduce = useReducedMotion();

  const push = useCallback((tone: Tone, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tone, message }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const value = useMemo(() => ({ push }), [push]);
  const icons = { success: IconCircleCheck, danger: IconAlertTriangle, info: IconInfoCircle };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = icons[t.tone];
            return (
              <motion.div
                key={t.id}
                role="status"
                initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 12 }}
                className={cn(
                  'pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-lg border bg-surface px-3.5 py-2.5 text-sm shadow-lg',
                  t.tone === 'success' && 'border-success/40',
                  t.tone === 'danger' && 'border-danger/40',
                  t.tone === 'info' && 'border-accent/40',
                )}
              >
                <Icon aria-hidden className={cn('mt-0.5 size-4 shrink-0', t.tone === 'success' && 'text-success', t.tone === 'danger' && 'text-danger', t.tone === 'info' && 'text-accent')} />
                <span>{t.message}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
