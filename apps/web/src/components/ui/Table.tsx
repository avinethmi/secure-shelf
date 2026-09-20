import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

// Docker Desktop style list: dense rows, subtle dividers, hover highlight. Below `sm` the
// table becomes stacked cards driven by data-label on each cell (FR-20 at 375px).

export function Table({ children, className, caption }: { children: ReactNode; className?: string; caption?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-card border border-border bg-surface', className)}>
      <table className="w-full text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="hidden bg-white/[0.03] text-left text-xs font-medium uppercase tracking-wide text-fg-muted sm:table-header-group">{children}</thead>;
}

export function TH({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th scope="col" className={cn('px-4 py-2.5 font-medium', className)}>
      {children}
    </th>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-border">{children}</tbody>;
}

export function TR({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <tr
      onClick={onClick}
      className={cn('block px-4 py-3 sm:table-row sm:px-0 sm:py-0', onClick && 'cursor-pointer hover:bg-white/[0.04]', !onClick && 'hover:bg-white/[0.02]', className)}
    >
      {children}
    </tr>
  );
}

export function TD({ children, label, className }: { children?: ReactNode; label?: string; className?: string }) {
  return (
    <td data-label={label} className={cn('flex items-center justify-between gap-3 py-1 sm:table-cell sm:px-4 sm:py-3', className)}>
      {label && <span className="text-xs text-fg-muted sm:hidden">{label}</span>}
      <span className="min-w-0 text-right sm:text-left">{children}</span>
    </td>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-fg-muted">
        {children}
      </td>
    </tr>
  );
}
