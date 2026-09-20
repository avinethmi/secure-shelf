import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { totpCodeSchema, type TotpCodeInput } from '@secureshelf/shared';
import { api, ApiError } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Alert';
import { AuthLayout } from './AuthLayout';
import { useAuth } from './useAuth';

function useCodeForm(kind: 'verify' | 'confirm') {
  const { completeTotp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const from = (location.state as { from?: string } | null)?.from ?? '/app';
  const form = useForm<TotpCodeInput>({ resolver: zodResolver(totpCodeSchema), defaultValues: { code: '' } });

  const onSubmit = form.handleSubmit(async ({ code }) => {
    setError(null);
    try {
      await completeTotp(kind, code);
      navigate(from, { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401 && /sign(ing)? in/i.test(e.message)) {
        navigate('/login', { replace: true });
        return;
      }
      setError(e instanceof ApiError ? e.message : 'Could not reach the server.');
      form.setFocus('code');
    }
  });
  return { form, onSubmit, error };
}

// FR-03 step 2 for an already-enrolled Owner / Security Admin.
export function TotpVerifyPage() {
  const { form, onSubmit, error } = useCodeForm('verify');
  return (
    <AuthLayout title="Enter your code" subtitle="Open your authenticator app and type the 6-digit code for SecureShelf.">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <Input label="6-digit code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} autoFocus required error={form.formState.errors.code?.message} {...form.register('code')} />
        <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>
          Verify and sign in
        </Button>
        <p className="text-center text-xs text-fg-muted">
          Lost your phone? Ask another Owner or Security Admin to reset your two-factor setup. <Link to="/login" className="text-accent underline-offset-2 hover:underline">Back to sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

// FR-03 first-login enrolment. The secret is shown once (QR + manual key).
export function TotpEnrolPage() {
  const { form, onSubmit, error } = useCodeForm('confirm');
  const navigate = useNavigate();
  const [setup, setSetup] = useState<{ qrDataUrl: string; manualKey: string } | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  useEffect(() => {
    api
      .post<{ qrDataUrl: string; manualKey: string }>('/auth/totp/enrol')
      .then(setSetup)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) navigate('/login', { replace: true });
        else setSetupError(e instanceof ApiError ? e.message : 'Could not start enrolment.');
      });
  }, [navigate]);

  return (
    <AuthLayout title="Set up two-factor authentication" subtitle="Your role requires a second factor. This takes about a minute and only happens once.">
      {setupError && <Alert tone="danger">{setupError}</Alert>}
      {setup && (
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-fg-muted">
            <li>Install Google Authenticator, Microsoft Authenticator or Authy on your phone.</li>
            <li>Scan this code with the app, or type the key below by hand.</li>
            <li>Enter the 6-digit code the app shows to finish.</li>
          </ol>
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-white p-3 sm:flex-row sm:items-start">
            <img src={setup.qrDataUrl} alt="QR code for your authenticator app" width={180} height={180} className="rounded" />
            <div className="min-w-0 text-neutral-900">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Manual key</p>
              <code className="mt-1 block break-all font-mono text-sm">{setup.manualKey.match(/.{1,4}/g)?.join(' ')}</code>
              <p className="mt-2 text-xs text-neutral-600">Account: SecureShelf. Type: time-based.</p>
            </div>
          </div>
          {error && <Alert tone="danger">{error}</Alert>}
          <Input label="6-digit code from the app" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} required error={form.formState.errors.code?.message} {...form.register('code')} />
          <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>
            Confirm and sign in
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
