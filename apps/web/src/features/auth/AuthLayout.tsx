import type { ReactNode } from 'react';
import { IconShieldLock } from '@tabler/icons-react';
import { Spotlight } from '@/components/aceternity/Spotlight';

// Shared frame for login, TOTP and enrolment: grid backdrop, spotlight, centred card.
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="bg-grid relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <Spotlight className="-top-40 left-0 md:-top-20 md:left-60" fill="#38bdf8" />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl border border-border bg-surface">
            <IconShieldLock aria-hidden className="size-5 text-accent" />
          </span>
          <div>
            <p className="text-gradient text-xl font-bold leading-tight">SecureShelf</p>
            <p className="text-xs text-fg-muted">Marvels security policy and awareness</p>
          </div>
        </div>
        <section aria-labelledby="auth-title" className="rounded-card border border-border bg-surface/90 p-6 shadow-[0_0_80px_-30px_var(--color-accent)] backdrop-blur">
          <h1 id="auth-title" className="text-2xl font-semibold">
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </section>
        <p className="mt-6 text-center text-xs text-fg-subtle">
          Sign-ins, lockouts and access decisions are recorded in the audit log in line with the staff monitoring notice.
        </p>
      </div>
    </main>
  );
}
