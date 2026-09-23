import { Moon01Icon, Sun01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DashboardShell } from '../components/layout/DashboardShell';
import { api, getApiErrorMessage } from '../lib/api';
import { cn } from '../lib/cn';

type LandingThemeMode = 'dark' | 'light';

type LandingThemePayload = {
  theme: LandingThemeMode;
  updatedAt?: string;
};

export function SuperAdminLandingTheme() {
  const queryClient = useQueryClient();

  const themeQuery = useQuery({
    queryKey: ['admin-landing-theme'],
    queryFn: async () => {
      const response = await api.get('/landing-theme');
      return response.data.data as LandingThemePayload;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (theme: LandingThemeMode) => {
      const response = await api.put('/landing-theme', { theme });
      return response.data.data as LandingThemePayload;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['admin-landing-theme'], data);
      queryClient.invalidateQueries({ queryKey: ['landing-theme'] });
      toast.success(`Landing theme set to ${data.theme}`);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const current = themeQuery.data?.theme || 'dark';

  return (
    <DashboardShell
      title="Landing theme"
      subtitle="Choose dark or light for the public Visit Hub landing page."
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-3xl border border-line bg-card p-6 shadow-sm">
          <p className="text-sm text-fog">
            Whatever you select here is what visitors see on the landing page. The header toggle on the
            landing site is removed — only this control changes the theme.
          </p>

          {themeQuery.isLoading ? (
            <p className="mt-6 text-sm text-fog">Loading theme...</p>
          ) : themeQuery.error ? (
            <p className="mt-6 text-sm text-danger">{getApiErrorMessage(themeQuery.error)}</p>
          ) : (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {(
                [
                  {
                    id: 'dark' as const,
                    title: 'Dark',
                    text: 'Black backgrounds, light text — default look.',
                    icon: Moon01Icon,
                    preview: 'bg-[#050505] text-white',
                  },
                  {
                    id: 'light' as const,
                    title: 'Light',
                    text: 'Light gray backgrounds, dark text.',
                    icon: Sun01Icon,
                    preview: 'bg-[#f4f4f5] text-[#111827]',
                  },
                ] as const
              ).map((option) => {
                const active = current === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={saveMutation.isPending}
                    onClick={() => saveMutation.mutate(option.id)}
                    className={cn(
                      'rounded-2xl border p-4 text-left transition',
                      active
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                        : 'border-line bg-bg hover:border-primary/40'
                    )}
                  >
                    <div className={cn('mb-4 h-20 rounded-xl', option.preview)} />
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <HugeiconsIcon icon={option.icon} size={18} color="currentColor" strokeWidth={1.8} />
                        <span className="font-semibold text-ink">{option.title}</span>
                      </div>
                      {active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">
                          <HugeiconsIcon icon={Tick02Icon} size={12} color="currentColor" strokeWidth={2} />
                          Active
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-fog">{option.text}</p>
                  </button>
                );
              })}
            </div>
          )}

          {themeQuery.data?.updatedAt ? (
            <p className="mt-4 text-xs text-fog">
              Last updated: {new Date(themeQuery.data.updatedAt).toLocaleString()}
            </p>
          ) : null}
        </div>
      </div>
    </DashboardShell>
  );
}
