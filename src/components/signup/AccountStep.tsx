import {
  ArrowRight01Icon,
  LockPasswordIcon,
  Mail01Icon,
  SmartPhone01Icon,
  UserIcon,
  ViewIcon,
  ViewOffIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { PasswordField, TextField } from '../ui/Fields';
import { accountSchema, type AccountFormValues } from '../../lib/schemas';
import { zodResolver } from '../../lib/zodResolver';
import { useSignupStore } from '../../store/signupStore';

type AccountStepProps = {
  onNext: () => void;
};

export function AccountStep({ onNext }: AccountStepProps) {
  const account = useSignupStore((state) => state.account);
  const setAccount = useSignupStore((state) => state.setAccount);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: account ?? {
      fullName: '',
      mobileNumber: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => {
        setAccount(values);
        onNext();
      })}
      className="space-y-5"
    >
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Your account</h2>
        <p className="mt-1 text-sm text-mute">Create login details for the organisation admin.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <TextField
            label="Full Name"
            icon={UserIcon}
            autoComplete="name"
            placeholder="Aarav Sharma"
            error={errors.fullName?.message}
            {...register('fullName')}
          />
        </div>
        <TextField
          label="Mobile Number"
          icon={SmartPhone01Icon}
          inputMode="numeric"
          autoComplete="tel"
          maxLength={10}
          placeholder="9876543210"
          error={errors.mobileNumber?.message}
          {...register('mobileNumber')}
        />
        <TextField
          label="Email"
          icon={Mail01Icon}
          type="email"
          autoComplete="email"
          placeholder="you@organisation.in"
          error={errors.email?.message}
          {...register('email')}
        />
        <PasswordField
          label="Password"
          icon={LockPasswordIcon}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          visible={showPassword}
          onToggle={() => setShowPassword((value) => !value)}
          eyeIcon={ViewIcon}
          eyeOffIcon={ViewOffIcon}
          error={errors.password?.message}
          {...register('password')}
        />
        <PasswordField
          label="Confirm Password"
          icon={LockPasswordIcon}
          autoComplete="new-password"
          placeholder="Re-enter password"
          visible={showConfirm}
          onToggle={() => setShowConfirm((value) => !value)}
          eyeIcon={ViewIcon}
          eyeOffIcon={ViewOffIcon}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
      </div>

      <div className="flex justify-center pt-1">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-primary-deep sm:w-auto"
        >
          Continue
          <HugeiconsIcon icon={ArrowRight01Icon} size={18} color="currentColor" strokeWidth={2} />
        </button>
      </div>
    </form>
  );
}
