import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { IconLogout, IconMenu2, IconShieldLock, IconX, IconFileText } from '@tabler/icons-react';
import { ROLE_LABELS } from '@secureshelf/shared';
import { cn } from '@/lib/cn';
import { useAuth } from '@/features/auth/useAuth';
import { NAV, NAV_GROUP_LABELS, type NavItem } from '@/app/nav';
import { usePendingAcknowledgements } from '@/features/policies/api';
import { clearGate } from '@/features/policies/AcknowledgementGate';

// Docker Desktop structure: fixed left sidebar (icon + label), top bar with page title and
// the signed-in user, content area. Below md the sidebar becomes a drawer (FR-20, 375px).
export function AppShell() {
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const reduce = useReducedMotion();
  const { pending } = usePendingAcknowledgements();

  useEffect(() => setDrawerOpen(false), [location.pathname]);

  const items = NAV.filter((n) => can(...n.permissions));
  const groups = (['work', 'govern', 'admin'] as const).map((g) => ({ key: g, label: NAV_GROUP_LABELS[g], items: items.filter((i) => i.group === g) })).filter((g) => g.items.length);
  const current = items.find((n) => (n.to === '/app' ? location.pathname === '/app' : location.pathname.startsWith(n.to)));
  const title = location.pathname === '/app/acknowledge' ? 'Policies to acknowledge' : (current?.label ?? 'SecureShelf');
  const showAckBanner = pending.length > 0 && location.pathname !== '/app/acknowledge' && !location.pathname.startsWith('/app/policies/read/');

  const onLogout = async () => {
    clearGate(user?.id);
    await logout();
    navigate('/login', { replace: true });
  };

  const NavList = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav aria-label="Main" className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
      {groups.map((g) => (
        <div key={g.key}>
          <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">{g.label}</p>
          <ul className="space-y-0.5">
            {g.items.map((item: NavItem) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/app'}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      isActive ? 'bg-white/[0.07] text-fg shadow-[inset_2px_0_0_0_var(--color-accent)]' : 'text-fg-muted hover:bg-white/5 hover:text-fg',
                    )
                  }
                >
                  <item.icon aria-hidden className="size-[18px] shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  const UserChip = () => (
    <div className="flex items-center gap-3 border-t border-border px-4 py-3">
      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent to-accent-3 text-sm font-semibold text-neutral-950">
        {initials(user?.fullName ?? '')}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user?.fullName}</p>
        <p className="truncate text-xs text-fg-muted">{user ? ROLE_LABELS[user.role] : ''}</p>
      </div>
      <button type="button" onClick={onLogout} aria-label="Sign out" title="Sign out" className="grid size-9 place-items-center rounded-lg text-fg-muted hover:bg-white/5 hover:text-fg">
        <IconLogout aria-hidden className="size-[18px]" />
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface/60 md:flex">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <IconShieldLock aria-hidden className="size-6 text-accent" />
          <span className="text-gradient text-lg font-bold">SecureShelf</span>
        </div>
        <NavList />
        <UserChip />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              initial={{ opacity: reduce ? 1 : 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: reduce ? 1 : 0 }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              className="fixed inset-y-0 left-0 z-50 flex w-[82vw] max-w-72 flex-col border-r border-border bg-surface md:hidden"
              initial={{ x: reduce ? 0 : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: reduce ? 0 : '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            >
              <div className="flex items-center justify-between px-4 py-4">
                <span className="text-gradient text-lg font-bold">SecureShelf</span>
                <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close menu" className="grid size-9 place-items-center rounded-lg text-fg-muted hover:bg-white/5">
                  <IconX aria-hidden className="size-5" />
                </button>
              </div>
              <NavList onNavigate={() => setDrawerOpen(false)} />
              <UserChip />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-bg/80 px-4 backdrop-blur md:px-6">
          <button type="button" onClick={() => setDrawerOpen(true)} aria-label="Open menu" className="grid size-9 place-items-center rounded-lg text-fg-muted hover:bg-white/5 md:hidden">
            <IconMenu2 aria-hidden className="size-5" />
          </button>
          <h1 className="truncate text-base font-semibold">{title}</h1>
        </header>
        {showAckBanner && (
          <div role="status" className="flex items-center gap-3 border-b border-warning/30 bg-warning/10 px-4 py-2 text-sm text-amber-100 md:px-6">
            <IconFileText aria-hidden className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">
              {pending.length} {pending.length === 1 ? 'policy needs' : 'policies need'} your acknowledgement.
            </span>
            <Link to="/app/acknowledge" className="shrink-0 font-medium underline-offset-2 hover:underline">
              Read now
            </Link>
          </div>
        )}
        <main className="flex-1 px-4 py-5 md:px-6 md:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}
