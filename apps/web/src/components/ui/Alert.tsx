import type { ReactNode } from 'react';
import { IconAlertTriangle, IconCircleCheck, IconInfoCircle, IconLock } from '@tabler/icons-react';
import { cn } from '@/lib/cn';

type Tone = 'info' | 'success' | 'warning' | 'danger';

const tones: Record<Tone, { box: string; Icon: typeof IconInfoCircle }> = {
  info: { box: 'border-accent/30 bg-accent/10 text-sky-100', Icon: IconInfoCircle },
  success: { box: 'border-success/30 bg-success/10 text-emerald-100', Icon: IconCircleCheck },
  warning: { box: 'border-warning/30 bg-warning/10 text-amber-100', Icon: IconAlertTriangle },
  danger: { box: 'border-danger/30 bg-danger/10 text-red-100', Icon: IconLock },
};

export function Alert({ tone = 'info', title, children, className }: { tone?: Tone; title?: string; children?: ReactNode; className?: string }) {
  const { box, Icon } = tones[tone];
  return (
    <div role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-lg border px-3.5 py-3 text-sm', box, className)}>
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5 opacity-90')}>{children}</div>}
      </div>
    </div>
  );
}
