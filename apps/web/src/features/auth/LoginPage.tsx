import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import { loginSchema, type LoginInput } from '@secureshelf/shared';
import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { FieldShell, Input, inputClass } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Alert';
import { AuthLayout } from './AuthLayout';
import { useAuth } from './useAuth';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<{ tone: 'danger' | 'warning'; message: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const from = (location.state as { from?: string } | null)?.from ?? '/app';

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    try {
      const r = await login(values.email, values.password);
      if (r.status === 'authenticated') navigate(from, { replace: true });
      else if (r.status === 'totp_required') navigate('/login/verify', { replace: true, state: { from } });
      else navigate('/login/enrol', { replace: true, state: { from } });
    } catch (e) {
      if (e instanceof ApiError && e.status === 423) setServerError({ tone: 'warning', message: e.message });
      else if (e instanceof ApiError && e.status === 429) setServerError({ tone: 'warning', message: e.message });
      else if (e instanceof ApiError) setServerError({ tone: 'danger', message: e.message });
      else setServerError({ tone: 'danger', message: 'Could not reach the server. Check your connection and try again.' });
    }
  });

  return (
    <AuthLayout title="Sign in" subtitle="Use your Marvels staff account.">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {serverError && <Alert tone={serverError.tone}>{serverError.message}</Alert>}

        <Input label="Email" type="email" autoComplete="username" inputMode="email" required error={form.formState.errors.email?.message} {...form.register('email')} />

        <FieldShell label="Password" required error={form.formState.errors.password?.message}>
          {({ id, describedBy }) => (
            <div className="relative">
              <input
                id={id}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                aria-invalid={!!form.formState.errors.password || undefined}
                aria-describedby={describedBy}
                className={inputClass(!!form.formState.errors.password) + ' pr-11'}
                {...form.register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-fg-muted hover:text-fg"
              >
                {showPassword ? <IconEyeOff aria-hidden className="size-4" /> : <IconEye aria-hidden className="size-4" />}
              </button>
            </div>
          )}
        </FieldShell>

        <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>
          Sign in
        </Button>

        <p className="text-center text-xs text-fg-muted">Owner and Security Admin accounts also need a code from an authenticator app.</p>
      </form>
    </AuthLayout>
  );
}
