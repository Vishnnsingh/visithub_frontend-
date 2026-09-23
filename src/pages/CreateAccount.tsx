import { AnimatePresence, motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Logo } from '../components/brand/Logo';
import { AccountStep } from '../components/signup/AccountStep';
import { OrganisationStep } from '../components/signup/OrganisationStep';
import { PaymentStep } from '../components/signup/PaymentStep';
import { Stepper } from '../components/signup/Stepper';
import { api, getApiErrorMessage } from '../lib/api';
import { homePath, type AuthUser } from '../lib/auth';
import type { OrganisationFormValues } from '../lib/schemas';
import { setOrgSessionForUser, getActiveOrgUser } from '../lib/session';
import { useSignupStore } from '../store/signupStore';

type RegisterResponse = {
  token: string;
  user: AuthUser;
  organization: {
    id?: string;
    name: string;
    businessType: string;
  };
};

export function CreateAccount() {
  const navigate = useNavigate();
  const step = useSignupStore((state) => state.step);
  const setStep = useSignupStore((state) => state.setStep);
  const account = useSignupStore((state) => state.account);
  const setOrganisation = useSignupStore((state) => state.setOrganisation);
  const resumeFromProgress = useSignupStore((state) => state.resumeFromProgress);
  const reset = useSignupStore((state) => state.reset);
  const [hydrated, setHydrated] = useState(() => useSignupStore.persist.hasHydrated());

  useEffect(() => {
    if (useSignupStore.persist.hasHydrated()) {
      setHydrated(true);
      resumeFromProgress();
      return;
    }
    return useSignupStore.persist.onFinishHydration(() => {
      setHydrated(true);
      resumeFromProgress();
    });
  }, [resumeFromProgress]);

  const registerMutation = useMutation({
    mutationFn: async (organisation: OrganisationFormValues) => {
      if (!account) {
        throw new Error('Please complete your account details first');
      }

      const { data } = await api.post('/auth/register', {
        fullName: account.fullName,
        mobileNumber: account.mobileNumber,
        email: account.email,
        password: account.password,
        confirmPassword: account.confirmPassword,
        organization: organisation,
      });

      return data.data as RegisterResponse;
    },
    onSuccess: (data) => {
      setOrganisation({});
      setOrgSessionForUser(data.token, data.user);
      toast.success('Account created. Choose a plan to activate your dashboard.');
      setStep(3);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Could not create account'));
    },
  });

  const handleOrganisationSubmit = (values: OrganisationFormValues) => {
    setOrganisation(values);
    registerMutation.mutate(values);
  };

  const handlePaymentSuccess = () => {
    const user = getActiveOrgUser();
    reset();
    navigate(user ? homePath(user) : '/login', { replace: true });
  };

  if (!hydrated) {
    return (
      <div className="app-bg relative flex min-h-screen items-center justify-center text-text">
        <p className="text-sm text-mute">Loading…</p>
      </div>
    );
  }

  return (
    <div className="app-bg relative min-h-screen overflow-hidden text-text">
      <main className="relative mx-auto w-full max-w-3xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16">
        <div className="mb-6 flex justify-center">
          <Logo to="/home" markOnly />
        </div>
        <div className="mb-8 text-center">
          <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-mute uppercase">
            Get started
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Create account</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-mute sm:text-base">
            {step === 3
              ? 'Select a plan and complete payment to open your organisation dashboard.'
              : 'The person who creates the account becomes the organisation admin.'}
          </p>
        </div>

        <Stepper currentStep={step} />

        <section className="mt-7 rounded-[28px] border border-line bg-card p-5 shadow-[0_18px_50px_rgba(17,24,39,0.06)] sm:p-8">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="account"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.22 }}
              >
                <AccountStep onNext={() => setStep(2)} />
              </motion.div>
            ) : step === 2 ? (
              <motion.div
                key="organisation"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.22 }}
              >
                <OrganisationStep
                  onBack={() => setStep(1)}
                  onSubmit={handleOrganisationSubmit}
                  isSubmitting={registerMutation.isPending}
                />
              </motion.div>
            ) : (
              <motion.div
                key="payment"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.22 }}
              >
                <PaymentStep onSuccess={handlePaymentSuccess} />
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {step < 3 ? (
          <>
            <p className="mt-6 text-center text-sm text-mute">
              <Link to="/terms" className="font-semibold text-ink hover:underline">
                Terms and conditions
              </Link>
              <span className="mx-2 text-mute">·</span>
              <Link to="/privacy" className="font-semibold text-ink hover:underline">
                Privacy policy
              </Link>
            </p>
            <p className="mt-4 text-center text-sm text-mute">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary">
                Sign in
              </Link>
            </p>
            <p className="mt-3 text-center text-sm">
              <Link to="/home" className="font-semibold text-ink hover:underline">
                Visit our Website
              </Link>
            </p>
          </>
        ) : null}
      </main>
    </div>
  );
}
