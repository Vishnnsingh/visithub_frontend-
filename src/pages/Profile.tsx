import {
  Building03Icon,
  Call02Icon,
  LockPasswordIcon,
  Mail01Icon,
  SmartPhone01Icon,
  UserIcon,
  ViewIcon,
  ViewOffIcon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { DashboardShell } from '../components/layout/DashboardShell';
import { PasswordField } from '../components/ui/Fields';
import { api, getApiErrorMessage } from '../lib/api';
import { roleLabel, type AuthUser, type Organization } from '../lib/auth';
import { changePasswordSchema, type ChangePasswordFormValues } from '../lib/schemas';
import { zodResolver } from '../lib/zodResolver';
import { useAuthStore } from '../store/authStore';
import { useStaffAuthStore } from '../store/staffAuthStore';
import { useSuperAuthStore } from '../store/superAuthStore';
import { resolveAuthArea } from '../lib/session';

type ProfileResponse = {
  user: AuthUser;
  organization: Organization | null;
};

export function Profile() {
  const area = resolveAuthArea('/profile');
  const adminUser = useAuthStore((state) => state.user);
  const staffUser = useStaffAuthStore((state) => state.user);
  const superUser = useSuperAuthStore((state) => state.user);
  const sessionUser =
    area === 'super' ? superUser : area === 'staff' ? staffUser : adminUser;
  const mePath = area === 'super' ? '/auth/superadmin/me' : '/auth/me';

  const { data, isLoading, error } = useQuery({
    queryKey: ['profile', area],
    queryFn: async () => {
      const response = await api.get(mePath);
      return response.data.data as ProfileResponse;
    },
  });

  const user = data?.user || sessionUser;
  const organization = data?.organization ?? null;

  return (
    <DashboardShell title="Your profile" subtitle="Account details, business profile, and password.">
      {isLoading ? (
        <p className="text-sm text-mute">Loading profile...</p>
      ) : error ? (
        <p className="text-sm text-danger">{getApiErrorMessage(error)}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-3xl border border-line bg-card p-5 shadow-sm sm:p-6">
            <p className="mb-4 text-xs font-semibold tracking-[0.16em] text-mute uppercase">
              Create account
            </p>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Info label="Full name" value={user?.fullName} icon={UserIcon} />
              <Info label="Mobile number" value={user?.phone} icon={SmartPhone01Icon} />
              <Info label="Email" value={user?.email} icon={Mail01Icon} />
              <Info label="Role" value={roleLabel(user?.role || '')} icon={UserIcon} />
            </dl>
          </section>

          <section className="rounded-3xl border border-line bg-card p-5 shadow-sm sm:p-6">
            <p className="mb-4 text-xs font-semibold tracking-[0.16em] text-mute uppercase">
              Business profile
            </p>
            {organization ? (
              <dl className="grid gap-4 sm:grid-cols-2">
                <Info label="Organization name" value={organization.name} icon={Building03Icon} />
                <Info label="Business type" value={organization.businessType} icon={Building03Icon} />
                <Info label="Contact number" value={organization.contactNumber} icon={Call02Icon} />
                <Info label="Email" value={organization.email} icon={Mail01Icon} />
                <Info
                  label="Address"
                  value={[
                    organization.addressLine1,
                    organization.addressLine2,
                    organization.city,
                    organization.state,
                    organization.pincode,
                    organization.country,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                  icon={Building03Icon}
                />
              </dl>
            ) : (
              <p className="text-sm text-mute">No business profile is linked to this account.</p>
            )}
          </section>

          <section className="rounded-3xl border border-line bg-card p-5 shadow-sm lg:col-span-2 sm:p-6">
            <p className="mb-4 text-xs font-semibold tracking-[0.16em] text-mute uppercase">
              Change password
            </p>
            <ChangePasswordForm />
          </section>
        </div>
      )}
    </DashboardShell>
  );
}

function ChangePasswordForm() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: ChangePasswordFormValues) => {
      const response = await api.post('/auth/change-password', values);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Password updated');
      reset();
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Could not update password'));
    },
  });

  return (
    <form
      className="grid gap-4 sm:grid-cols-3"
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
    >
      <PasswordField
        label="Current password"
        icon={LockPasswordIcon}
        autoComplete="current-password"
        placeholder="Enter current password"
        visible={showCurrent}
        onToggle={() => setShowCurrent((value) => !value)}
        eyeIcon={ViewIcon}
        eyeOffIcon={ViewOffIcon}
        error={errors.currentPassword?.message}
        {...register('currentPassword')}
      />
      <PasswordField
        label="New password"
        icon={LockPasswordIcon}
        autoComplete="new-password"
        placeholder="At least 8 characters"
        visible={showNext}
        onToggle={() => setShowNext((value) => !value)}
        eyeIcon={ViewIcon}
        eyeOffIcon={ViewOffIcon}
        error={errors.newPassword?.message}
        {...register('newPassword')}
      />
      <PasswordField
        label="Confirm password"
        icon={LockPasswordIcon}
        autoComplete="new-password"
        placeholder="Re-enter new password"
        visible={showConfirm}
        onToggle={() => setShowConfirm((value) => !value)}
        eyeIcon={ViewIcon}
        eyeOffIcon={ViewOffIcon}
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
      <div className="sm:col-span-3 flex justify-center pt-1">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mutation.isPending ? 'Updating...' : 'Update password'}
        </button>
      </div>
    </form>
  );
}

function Info({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | null;
  icon: IconSvgElement;
}) {
  return (
    <div>
      <dt className="flex items-center gap-2 text-xs text-mute">
        <HugeiconsIcon icon={icon} size={14} color="currentColor" strokeWidth={1.8} />
        {label}
      </dt>
      <dd className="mt-1 text-sm text-fog">{value || '—'}</dd>
    </div>
  );
}
