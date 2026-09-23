import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AccountFormValues, OrganisationFormValues } from '../lib/schemas';

type SignupStore = {
  step: 1 | 2 | 3;
  account: AccountFormValues | null;
  organisation: Partial<OrganisationFormValues> | null;
  setStep: (step: 1 | 2 | 3) => void;
  setAccount: (account: AccountFormValues) => void;
  setOrganisation: (organisation: Partial<OrganisationFormValues>) => void;
  /** After account save → 2; after register → 3; no account → 1 */
  resumeFromProgress: () => void;
  reset: () => void;
};

function resolveResumeStep(
  step: 1 | 2 | 3,
  account: AccountFormValues | null
): 1 | 2 | 3 {
  if (!account) return 1;
  // Account done → never show step 1 again until reset
  if (step === 1) return 2;
  return step;
}

export const useSignupStore = create<SignupStore>()(
  persist(
    (set, get) => ({
      step: 1,
      account: null,
      organisation: null,
      setStep: (step) => set({ step }),
      setAccount: (account) => set({ account }),
      setOrganisation: (organisation) => set({ organisation }),
      resumeFromProgress: () => {
        const { step, account } = get();
        const next = resolveResumeStep(step, account);
        if (next !== step) set({ step: next });
      },
      reset: () => set({ step: 1, account: null, organisation: null }),
    }),
    {
      name: 'visithub-signup-draft',
      partialize: (state) => ({
        step: state.step,
        account: state.account,
        organisation: state.organisation,
      }),
    }
  )
);
