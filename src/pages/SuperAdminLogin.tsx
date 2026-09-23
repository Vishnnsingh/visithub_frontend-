import {
  ArrowRight01Icon,
  LockPasswordIcon,
  Mail01Icon,
  ViewIcon,
  ViewOffIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Logo } from '../components/brand/Logo';
import { PasswordField, TextField } from '../components/ui/Fields';
import { isSuperAdminPath } from '../components/auth/Guards';
import { api, getApiErrorMessage } from '../lib/api';
import { USER_ROLES, type AuthUser } from '../lib/auth';
import { loginSchema, type LoginFormValues } from '../lib/schemas';
import { zodResolver } from '../lib/zodResolver';
import { useSuperAuthStore } from '../store/superAuthStore';

type LoginResponse = {
  token: string;
  user: AuthUser;
};

export function SuperAdminLogin() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const setSession = useSuperAuthStore((state) => state.setSession);
  const [showPassword, setShowPassword] = useState(false);

  const nextRaw = params.get('next') || '';
  const nextPath = nextRaw.startsWith('/') && isSuperAdminPath(nextRaw) ? nextRaw : '/superadmin';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const loginMutation = useMutation({
    mutationFn: async (values: LoginFormValues) => {
      const { data } = await api.post('/auth/superadmin/login', values);
      return data.data as LoginResponse;
    },
    onSuccess: (data) => {
      if (data.user.role !== USER_ROLES.SUPER_ADMIN) {
        toast.error('Use Visit Hub staff account for /superadmin');
        return;
      }
      setSession(data.token, data.user);
      toast.success('Welcome back');
      navigate(nextPath, { replace: true });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Could not sign in'));
    },
  });

  return (
    <div className="app-bg relative min-h-screen overflow-hidden text-text">
      <main className="relative mx-auto flex w-full max-w-md flex-col px-4 pt-12 pb-16 sm:px-6 sm:pt-16">
        <div className="mb-8 flex justify-center">
          <Logo to="/home" markOnly />
        </div>
        <div className="mb-8 text-center">
          <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-mute uppercase">
            Visit Hub staff
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-ink">Login</h1>
        </div>

        <section className="rounded-[28px] border border-line bg-card p-5 shadow-[0_18px_50px_rgba(17,24,39,0.06)] sm:p-8">
          <form
            className="space-y-4"
            onSubmit={handleSubmit((values) => loginMutation.mutate(values))}
          >
            <TextField
              label="Email"
              icon={Mail01Icon}
              type="email"
              autoComplete="email"
              placeholder="staff@visithub.in"
              error={errors.email?.message}
              {...register('email')}
            />
            <PasswordField
              label="Password"
              icon={LockPasswordIcon}
              autoComplete="current-password"
              placeholder="Enter password"
              visible={showPassword}
              onToggle={() => setShowPassword((value) => !value)}
              eyeIcon={ViewIcon}
              eyeOffIcon={ViewOffIcon}
              error={errors.password?.message}
              {...register('password')}
            />
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-primary-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
              <HugeiconsIcon icon={ArrowRight01Icon} size={18} color="currentColor" strokeWidth={2} />
            </button>
          </form>
        </section>

        <p className="mt-6 text-center text-sm">
          <Link to="/home" className="font-semibold text-ink hover:underline">
            Visit our Website
          </Link>
        </p>
        <p className="mt-3 text-center text-sm">
          <Link to="/login" className="font-semibold text-ink hover:underline">
            Organisation admin login
          </Link>
        </p>
      </main>
    </div>
  );
}
