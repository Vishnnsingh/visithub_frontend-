import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Call02Icon,
  Cancel01Icon,
  Delete02Icon,
  LockPasswordIcon,
  Mail01Icon,
  MoreVerticalIcon,
  PencilEdit02Icon,
  UserAdd01Icon,
  UserIcon,
  UserMultipleIcon,
  ViewIcon,
  ViewOffIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { DashboardShell } from '../components/layout/DashboardShell';
import { PasswordField, SelectField, TextField } from '../components/ui/Fields';
import { api, getApiErrorMessage } from '../lib/api';
import { cn } from '../lib/cn';
import {
  staffAccountSchema,
  staffEditSchema,
  staffRoleSchema,
  type StaffAccountFormValues,
  type StaffEditFormValues,
  type StaffRoleFormValues,
} from '../lib/schemas';
import { zodResolver } from '../lib/zodResolver';
import { STAFF_DASHBOARD_ACCESS } from '../lib/dashboardAccess';

type StaffRole = {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  assignedCount?: number;
};

type StaffItem = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  isActive: boolean;
  roleId: string | null;
  accountCode: string | null;
  roleCode: string | null;
  roleName: string | null;
  allowedPages?: string[];
  createdAt: string;
  updatedAt: string;
};

type StaffPageData = {
  summary: {
    totalStaff: number;
    totalRoles: number;
    totalActive: number;
  };
  roles: StaffRole[];
  items: StaffItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export function Staff() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [editing, setEditing] = useState<StaffItem | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['staff', page, roleFilter],
    queryFn: async () => {
      const response = await api.get('/staff', {
        params: { page, limit: 10, roleId: roleFilter || undefined },
      });
      return response.data.data as StaffPageData;
    },
  });

  const summary = data?.summary || { totalStaff: 0, totalRoles: 0, totalActive: 0 };
  const roles = data?.roles || [];
  const items = data?.items || [];
  const pagination = data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };
  const roleOptions = roles.map((role) => ({
    value: role.id,
    label: `${role.name} (${role.code})`,
  }));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['staff'] });

  return (
    <DashboardShell title="Add Staff" subtitle="Create roles first, then add staff accounts.">
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Total staff" value={summary.totalStaff} />
        <SummaryCard label="Total roles" value={summary.totalRoles} />
        <SummaryCard label="Active accounts" value={summary.totalActive} />
      </div>

      <div className="mt-4 grid items-stretch gap-4 lg:grid-cols-2">
        <RoleForm roles={roles} onCreated={invalidate} />
        <AccountForm roles={roleOptions} onCreated={() => { setPage(1); invalidate(); }} />
      </div>

      <section className="mt-4 rounded-3xl border border-line bg-card p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-mute uppercase">Staff accounts</p>
            <p className="mt-1 text-sm text-mute">10 per page. Filter by role without recounting totals.</p>
          </div>
          <div className="w-full sm:max-w-xs">
            <SelectField
              label="Filter by role"
              icon={UserMultipleIcon}
              optional
              placeholder="All roles"
              options={[{ value: '', label: 'All roles' }, ...roleOptions]}
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-mute">Loading staff...</p>
        ) : error ? (
          <p className="text-sm text-danger">{getApiErrorMessage(error)}</p>
        ) : items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-mute">
            No staff accounts yet. Create a role, then add an account.
          </p>
        ) : (
          <>
            <div className="overflow-visible">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs tracking-wide text-mute uppercase">
                    <th className="py-3 pr-3 font-semibold">S.no</th>
                    <th className="py-3 pr-4 font-semibold">Name</th>
                    <th className="py-3 pr-4 font-semibold">Account id</th>
                    <th className="py-3 pr-4 font-semibold">Email</th>
                    <th className="py-3 pr-4 font-semibold">Number</th>
                    <th className="py-3 pr-4 font-semibold">Role</th>
                    <th className="py-3 pr-4 font-semibold">Status</th>
                    <th className="py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <StaffRow
                      key={item.id}
                      serial={(pagination.page - 1) * pagination.limit + index + 1}
                      item={item}
                      onEdit={() => setEditing(item)}
                      onChanged={invalidate}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-mute">
                Page {pagination.page} of {pagination.totalPages} · {pagination.total} staff
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="grid size-9 place-items-center rounded-full border border-line text-fog transition hover:text-primary disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} size={16} color="currentColor" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                  className="grid size-9 place-items-center rounded-full border border-line text-fog transition hover:text-primary disabled:opacity-40"
                  aria-label="Next page"
                >
                  <HugeiconsIcon icon={ArrowRight01Icon} size={16} color="currentColor" strokeWidth={2} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {editing ? (
        <EditStaffModal
          staff={editing}
          roles={roleOptions}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            invalidate();
          }}
        />
      ) : null}
    </DashboardShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-3xl border border-line bg-card px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold tracking-[0.16em] text-mute uppercase">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
    </article>
  );
}

function RoleForm({ roles, onCreated }: { roles: StaffRole[]; onCreated: () => void }) {
  const [rolePage, setRolePage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(roles.length / pageSize));
  const safePage = Math.min(rolePage, totalPages);
  const pagedRoles = roles.slice((safePage - 1) * pageSize, safePage * pageSize);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StaffRoleFormValues>({
    resolver: zodResolver(staffRoleSchema),
    defaultValues: { name: '' },
  });

  const mutation = useMutation({
    mutationFn: async (values: StaffRoleFormValues) => {
      const response = await api.post('/staff/roles', values);
      return response.data.data as StaffRole;
    },
    onSuccess: (role) => {
      toast.success(`Role created · ${role.code}`);
      reset();
      setRolePage(1);
      onCreated();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not create role')),
  });

  const deleteMutation = useMutation({
    mutationFn: async (role: StaffRole) => {
      if ((role.assignedCount || 0) > 0) {
        throw new Error('This role is assigned to staff. Delete those accounts first, then delete the role.');
      }
      await api.delete(`/staff/roles/${role.id}`);
    },
    onSuccess: () => {
      toast.success('Role deleted');
      onCreated();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not delete role')),
  });

  return (
    <form
      className="flex h-full flex-col rounded-3xl border border-line bg-card p-5 shadow-sm sm:p-6"
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
    >
      <p className="text-xs font-semibold tracking-[0.16em] text-mute uppercase">Create role</p>
      <p className="mt-1 mb-3 text-xs text-mute">Admin role cannot be created. Each role gets an 8-character id.</p>
      <TextField
        label="Role name"
        icon={UserMultipleIcon}
        placeholder="Enter role name"
        error={errors.name?.message}
        {...register('name')}
      />
      <div className="mt-3 flex justify-center">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-deep disabled:opacity-60"
        >
          {mutation.isPending ? 'Creating...' : 'Create role'}
        </button>
      </div>

      <div className="mt-4 min-h-0 flex-1">
        <p className="mb-1.5 text-[10px] font-semibold tracking-[0.16em] text-mute uppercase">Roles</p>
        <table className="w-full table-fixed text-left text-[11px] leading-tight">
          <thead>
            <tr className="border-b border-line text-[10px] tracking-wide text-mute uppercase">
              <th className="w-8 py-1.5 font-semibold">S.no</th>
              <th className="py-1.5 pr-2 font-semibold">Name</th>
              <th className="w-20 py-1.5 font-semibold">Role id</th>
              <th className="w-10 py-1.5 text-right font-semibold"> </th>
            </tr>
          </thead>
          <tbody>
            {pagedRoles.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-3 text-mute">
                  No roles yet
                </td>
              </tr>
            ) : (
              pagedRoles.map((role, index) => {
                const serial = (safePage - 1) * pageSize + index + 1;
                return (
                  <tr key={role.id} className="border-b border-line last:border-0">
                    <td className="h-7 py-1 text-mute">{serial}</td>
                    <td className="h-7 truncate py-1 pr-2 text-ink">{role.name}</td>
                    <td className="h-7 py-1 font-medium tracking-wide text-mute">{role.code}</td>
                    <td className="h-7 py-1 text-right">
                      <button
                        type="button"
                        title={(role.assignedCount || 0) > 0 ? 'Delete assigned staff first' : 'Delete role'}
                        onClick={() => deleteMutation.mutate(role)}
                        disabled={deleteMutation.isPending}
                        className="inline-flex text-mute transition hover:text-danger disabled:opacity-40"
                        aria-label={`Delete ${role.name}`}
                      >
                        <HugeiconsIcon icon={Delete02Icon} size={13} color="currentColor" strokeWidth={1.8} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[10px] text-mute">
            {roles.length ? `${safePage}/${totalPages}` : 'No roles yet'}
          </p>
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setRolePage((current) => Math.max(1, current - 1))}
              className="grid size-7 place-items-center rounded-full border border-line text-fog transition hover:text-primary disabled:opacity-40"
              aria-label="Previous roles"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={12} color="currentColor" strokeWidth={2} />
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setRolePage((current) => current + 1)}
              className="grid size-7 place-items-center rounded-full border border-line text-fog transition hover:text-primary disabled:opacity-40"
              aria-label="Next roles"
            >
              <HugeiconsIcon icon={ArrowRight01Icon} size={12} color="currentColor" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function AccessDashboardChecklist({
  value,
  onChange,
  error,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
}) {
  const toggle = (path: string) => {
    if (value.includes(path)) onChange(value.filter((item) => item !== path));
    else onChange([...value, path]);
  };

  const allSelected = STAFF_DASHBOARD_ACCESS.every((item) => value.includes(item.path));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <label className="text-sm font-semibold text-ink">
          Access dashboard <span className="text-danger">*</span>
        </label>
        <button
          type="button"
          className="text-xs font-semibold text-primary"
          onClick={() =>
            onChange(allSelected ? [] : STAFF_DASHBOARD_ACCESS.map((item) => item.path))
          }
        >
          {allSelected ? 'Clear all' : 'Select all'}
        </button>
      </div>
      <p className="mb-2 text-xs text-mute">
        Choose which pages this staff can open. Add Staff stays admin-only.
      </p>
      <div className="grid gap-2 rounded-2xl border border-line bg-bg/50 p-3 sm:grid-cols-2">
        {STAFF_DASHBOARD_ACCESS.map((item) => {
          const checked = value.includes(item.path);
          return (
            <label
              key={item.path}
              className={cn(
                'flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition',
                checked ? 'border-primary/40 bg-white text-ink' : 'border-transparent text-fog hover:bg-white/70'
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(item.path)}
                className="size-4 rounded border-line accent-primary"
              />
              <span className="font-medium">{item.label}</span>
            </label>
          );
        })}
      </div>
      {error ? <p className="mt-1.5 text-xs font-medium text-danger">{error}</p> : null}
    </div>
  );
}

function AccountForm({
  roles,
  onCreated,
}: {
  roles: Array<{ value: string; label: string }>;
  onCreated: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StaffAccountFormValues>({
    resolver: zodResolver(staffAccountSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      roleId: '',
      allowedPages: ['/admin'],
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: StaffAccountFormValues) => {
      const response = await api.post('/staff', values);
      return response.data.data as StaffItem;
    },
    onSuccess: () => {
      toast.success('Staff account created');
      reset({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        roleId: '',
        allowedPages: ['/admin'],
      });
      onCreated();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not create account')),
  });

  const roleId = watch('roleId');
  const allowedPages = watch('allowedPages') || [];

  return (
    <form
      className="flex h-full flex-col rounded-3xl border border-line bg-card p-5 shadow-sm sm:p-6"
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
    >
      <p className="text-xs font-semibold tracking-[0.16em] text-mute uppercase">Create account</p>
      <p className="mt-1 mb-4 text-sm text-mute">
        {roles.length ? 'Choose a role created above, then add staff login details.' : 'Create a role first before adding staff.'}
      </p>
      <div className="grid gap-4">
        <TextField
          label="Full name"
          icon={UserIcon}
          placeholder="Aarav Sharma"
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <TextField
          label="Email"
          icon={Mail01Icon}
          type="email"
          placeholder="staff@organisation.in"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Number"
          icon={Call02Icon}
          inputMode="numeric"
          maxLength={10}
          placeholder="9876543210"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <SelectField
          label="Role"
          icon={UserMultipleIcon}
          placeholder={roles.length ? 'Select role' : 'Create a role first'}
          options={roles}
          value={roleId}
          error={errors.roleId?.message}
          disabled={!roles.length}
          onChange={(event) => setValue('roleId', event.target.value, { shouldValidate: true })}
        />
        <AccessDashboardChecklist
          value={allowedPages}
          onChange={(next) => setValue('allowedPages', next, { shouldValidate: true })}
          error={errors.allowedPages?.message}
        />
        <PasswordField
          label="Password"
          icon={LockPasswordIcon}
          placeholder="At least 8 characters"
          visible={showPassword}
          onToggle={() => setShowPassword((value) => !value)}
          eyeIcon={ViewIcon}
          eyeOffIcon={ViewOffIcon}
          error={errors.password?.message}
          {...register('password')}
        />
      </div>
      <div className="mt-4 flex justify-center">
        <button
          type="submit"
          disabled={mutation.isPending || !roles.length}
          className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-deep disabled:opacity-60"
        >
          <HugeiconsIcon icon={UserAdd01Icon} size={16} color="currentColor" strokeWidth={2} />
          {mutation.isPending ? 'Creating...' : 'Create account'}
        </button>
      </div>
    </form>
  );
}

function StaffRow({
  serial,
  item,
  onEdit,
  onChanged,
}: {
  serial: number;
  item: StaffItem;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const toggleMenu = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (!open) {
      const menuWidth = 176;
      setMenuPos({
        top: rect.bottom + 6,
        left: Math.max(8, rect.right - menuWidth),
      });
    }
    setOpen((current) => !current);
  };

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onReposition = () => setOpen(false);
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('resize', onReposition);
    document.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('resize', onReposition);
      document.removeEventListener('scroll', onReposition, true);
    };
  }, []);

  const statusMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      await api.patch(`/staff/${item.id}/status`, { isActive });
    },
    onSuccess: (_, isActive) => {
      toast.success(isActive ? 'Staff activated' : 'Staff deactivated');
      setOpen(false);
      onChanged();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not update status')),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/staff/${item.id}`);
    },
    onSuccess: () => {
      toast.success('Staff account deleted');
      setOpen(false);
      onChanged();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not delete staff')),
  });

  return (
    <tr className="border-b border-line last:border-0">
      <td className="py-3 pr-3 text-mute">{serial}</td>
      <td className="py-3 pr-4 font-medium text-ink">{item.fullName}</td>
      <td className="py-3 pr-4 font-medium tracking-wide text-mute">{item.accountCode || '—'}</td>
      <td className="py-3 pr-4 text-fog">{item.email}</td>
      <td className="py-3 pr-4 text-fog">{item.phone}</td>
      <td className="py-3 pr-4">
        <p className="text-fog">{item.roleName || '—'}</p>
        <p className="text-xs text-mute">{item.roleCode}</p>
      </td>
      <td className="py-3 pr-4">
        <span
          className={cn(
            'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
            item.isActive ? 'bg-ink-soft text-ink' : 'bg-bg text-mute'
          )}
        >
          {item.isActive ? 'Active' : 'Deactivated'}
        </span>
      </td>
      <td className="py-3">
        <div className="relative">
          <button
            ref={buttonRef}
            type="button"
            onClick={toggleMenu}
            className="grid size-8 place-items-center rounded-full border border-line text-fog transition hover:text-primary"
            aria-label="Staff actions"
            aria-expanded={open}
          >
            <HugeiconsIcon icon={MoreVerticalIcon} size={16} color="currentColor" strokeWidth={1.8} />
          </button>
          {open
            ? createPortal(
                <div
                  ref={menuRef}
                  className="fixed z-[9999] w-44 rounded-2xl border border-line bg-card py-1 shadow-[0_16px_40px_rgba(17,24,39,0.16)]"
                  style={{ top: menuPos.top, left: menuPos.left }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onEdit();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fog hover:bg-bg hover:text-ink"
                  >
                    <HugeiconsIcon icon={PencilEdit02Icon} size={14} color="currentColor" strokeWidth={1.8} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => statusMutation.mutate(!item.isActive)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fog hover:bg-bg hover:text-ink"
                  >
                    {item.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete ${item.fullName}?`)) deleteMutation.mutate();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-bg"
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={14} color="currentColor" strokeWidth={1.8} />
                    Delete
                  </button>
                </div>,
                document.body
              )
            : null}
        </div>
      </td>
    </tr>
  );
}

function EditStaffModal({
  staff,
  roles,
  onClose,
  onSaved,
}: {
  staff: StaffItem;
  roles: Array<{ value: string; label: string }>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StaffEditFormValues>({
    resolver: zodResolver(staffEditSchema),
    defaultValues: {
      fullName: staff.fullName,
      email: staff.email,
      phone: staff.phone,
      password: '',
      roleId: staff.roleId || '',
      allowedPages: staff.allowedPages?.length ? staff.allowedPages : ['/admin'],
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: StaffEditFormValues) => {
      await api.patch(`/staff/${staff.id}`, {
        ...values,
        password: values.password || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Staff account updated');
      onSaved();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not update staff')),
  });

  const roleId = watch('roleId');
  const allowedPages = watch('allowedPages') || [];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center px-4">
      <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Close edit" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-line bg-card p-5 shadow-[0_24px_60px_rgba(17,24,39,0.16)] sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-mute uppercase">Edit staff</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">Update account details</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full border border-line text-fog hover:text-primary"
            aria-label="Close"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} color="currentColor" strokeWidth={1.8} />
          </button>
        </div>
        <form className="grid gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <TextField
            label="Full name"
            icon={UserIcon}
            error={errors.fullName?.message}
            {...register('fullName')}
          />
          <TextField
            label="Email"
            icon={Mail01Icon}
            type="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <TextField
            label="Number"
            icon={Call02Icon}
            inputMode="numeric"
            maxLength={10}
            error={errors.phone?.message}
            {...register('phone')}
          />
          <SelectField
            label="Role"
            icon={UserMultipleIcon}
            options={roles}
            value={roleId}
            error={errors.roleId?.message}
            onChange={(event) => setValue('roleId', event.target.value, { shouldValidate: true })}
          />
          <AccessDashboardChecklist
            value={allowedPages}
            onChange={(next) => setValue('allowedPages', next, { shouldValidate: true })}
            error={errors.allowedPages?.message}
          />
          <PasswordField
            label="Password"
            icon={LockPasswordIcon}
            optional
            placeholder="Leave blank to keep current"
            visible={showPassword}
            onToggle={() => setShowPassword((value) => !value)}
            eyeIcon={ViewIcon}
            eyeOffIcon={ViewOffIcon}
            error={errors.password?.message}
            {...register('password')}
          />
          <div className="flex justify-center pt-1">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-deep disabled:opacity-60"
            >
              {mutation.isPending ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
