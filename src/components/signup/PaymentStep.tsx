import { Add01Icon, ArrowRight01Icon, MinusSignIcon, Tick02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { api, getApiErrorMessage } from '../../lib/api';
import { cn } from '../../lib/cn';

type CatalogPlan = {
  id: string;
  name: string;
  months: number;
  priceInr: number;
  description: string;
  features: string[];
  highlighted: boolean;
};

type CustomPlanSettings = {
  monthlyPriceInr: number;
  minMonths: number;
  maxMonths: number;
  defaultMonths: number;
  orgOverride?: boolean;
  businessType?: string | null;
};

type PaymentStepProps = {
  onSuccess: () => void;
};

const PRESETS = [1, 6, 12] as const;

function formatPrice(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function PaymentStep({ onSuccess }: PaymentStepProps) {
  const [mode, setMode] = useState<'catalog' | 'custom'>('catalog');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [customMonths, setCustomMonths] = useState(1);

  const plansQuery = useQuery({
    queryKey: ['public-plans'],
    queryFn: async () => {
      const response = await api.get('/plans');
      return response.data.data as CatalogPlan[];
    },
  });

  const customSettingsQuery = useQuery({
    queryKey: ['custom-plan-settings'],
    queryFn: async () => {
      const response = await api.get('/plans/custom-settings');
      return response.data.data as CustomPlanSettings;
    },
  });

  const customSettings = customSettingsQuery.data || {
    monthlyPriceInr: 499,
    minMonths: 1,
    maxMonths: 60,
    defaultMonths: 1,
  };

  useEffect(() => {
    if (!customSettingsQuery.data) return;
    setCustomMonths((current) => {
      const next = customSettingsQuery.data.defaultMonths;
      if (current < customSettingsQuery.data.minMonths || current > customSettingsQuery.data.maxMonths) {
        return next;
      }
      return current;
    });
  }, [customSettingsQuery.data]);

  const plans = (plansQuery.data || []).filter((p) => p.months > 0 && p.priceInr > 0);
  const selected = plans.find((p) => p.id === selectedPlanId) || plans[0] || null;

  const customPrice = useMemo(
    () => Math.round(customSettings.monthlyPriceInr * customMonths),
    [customSettings.monthlyPriceInr, customMonths]
  );

  const payMutation = useMutation({
    mutationFn: async () => {
      if (mode === 'catalog') {
        const plan = selected;
        if (!plan) throw new Error('Select a plan');
        const response = await api.post('/subscription/purchase', {
          planId: plan.id,
          months: plan.months,
        });
        return response.data.data;
      }
      const response = await api.post('/subscription/purchase', {
        planId: null,
        months: customMonths,
        planName: `Custom (${customMonths} month${customMonths === 1 ? '' : 's'})`,
      });
      return response.data.data;
    },
    onSuccess: () => {
      toast.success('Payment successful. Your plan is active.');
      onSuccess();
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Payment failed')),
  });

  const presetOptions = PRESETS.filter(
    (m) => m >= customSettings.minMonths && m <= customSettings.maxMonths
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink">Choose your plan</h2>
        <p className="mt-1 text-sm text-mute">
          Dummy payment for now — a real payment gateway can be connected later. Dashboard unlocks after
          payment.
        </p>
      </div>

      <div className="flex gap-2 rounded-full bg-bg p-1">
        <button
          type="button"
          className={cn(
            'flex-1 rounded-full px-4 py-2 text-sm font-semibold transition',
            mode === 'catalog' ? 'bg-primary text-white' : 'text-fog hover:text-ink'
          )}
          onClick={() => setMode('catalog')}
        >
          Catalog plans
        </button>
        <button
          type="button"
          className={cn(
            'flex-1 rounded-full px-4 py-2 text-sm font-semibold transition',
            mode === 'custom' ? 'bg-primary text-white' : 'text-fog hover:text-ink'
          )}
          onClick={() => setMode('custom')}
        >
          Custom
        </button>
      </div>

      {mode === 'catalog' ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {plans.map((plan) => {
            const active = (selectedPlanId || selected?.id) === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlanId(plan.id)}
                className={cn(
                  'rounded-2xl border p-4 text-left transition',
                  active ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-line bg-bg'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold tracking-wide text-mute uppercase">{plan.name}</p>
                  {active ? (
                    <HugeiconsIcon icon={Tick02Icon} size={16} color="currentColor" strokeWidth={2} />
                  ) : null}
                </div>
                <p className="mt-2 text-2xl font-bold text-ink">{formatPrice(plan.priceInr)}</p>
                <p className="mt-1 text-xs text-mute">{plan.months} month{plan.months === 1 ? '' : 's'}</p>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-bg p-5">
          <label className="text-sm font-medium text-ink">Duration</label>
          {presetOptions.length ? (
            <select
              className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink"
              value={
                presetOptions.includes(customMonths as (typeof PRESETS)[number])
                  ? customMonths
                  : 'custom'
              }
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'custom') return;
                setCustomMonths(Number(v));
              }}
            >
              {presetOptions.map((m) => (
                <option key={m} value={m}>
                  {m} month{m === 1 ? '' : 's'}
                </option>
              ))}
              <option value="custom">Custom months</option>
            </select>
          ) : null}

          <div className="mt-4 flex items-center justify-center gap-4">
            <button
              type="button"
              className="grid size-10 place-items-center rounded-full border border-line bg-white text-ink disabled:opacity-40"
              onClick={() =>
                setCustomMonths((m) => Math.max(customSettings.minMonths, m - 1))
              }
              disabled={customMonths <= customSettings.minMonths}
              aria-label="Decrease months"
            >
              <HugeiconsIcon icon={MinusSignIcon} size={18} color="currentColor" strokeWidth={2} />
            </button>
            <div className="min-w-[6rem] text-center">
              <p className="text-3xl font-bold text-ink">{customMonths}</p>
              <p className="text-xs text-mute">month{customMonths === 1 ? '' : 's'}</p>
            </div>
            <button
              type="button"
              className="grid size-10 place-items-center rounded-full border border-line bg-white text-ink disabled:opacity-40"
              onClick={() =>
                setCustomMonths((m) => Math.min(customSettings.maxMonths, m + 1))
              }
              disabled={customMonths >= customSettings.maxMonths}
              aria-label="Increase months"
            >
              <HugeiconsIcon icon={Add01Icon} size={18} color="currentColor" strokeWidth={2} />
            </button>
          </div>

          <p className="mt-3 text-center text-xs text-mute">
            {formatPrice(customSettings.monthlyPriceInr)}/month
            {customSettings.orgOverride
              ? ` (rate for ${customSettings.businessType || 'your organisation'})`
              : ''} · allowed{' '}
            {customSettings.minMonths}–{customSettings.maxMonths} months
          </p>
          <p className="mt-2 text-center text-sm text-mute">
            Estimated total{' '}
            <span className="font-semibold text-ink">{formatPrice(customPrice)}</span>
          </p>
        </div>
      )}

      <button
        type="button"
        disabled={payMutation.isPending || (mode === 'catalog' && !selected)}
        onClick={() => payMutation.mutate()}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-primary-deep disabled:cursor-not-allowed disabled:opacity-60"
      >
        {payMutation.isPending
          ? 'Processing payment...'
          : `Pay ${formatPrice(mode === 'catalog' ? selected?.priceInr || 0 : customPrice)} (dummy)`}
        <HugeiconsIcon icon={ArrowRight01Icon} size={18} color="currentColor" strokeWidth={2} />
      </button>
    </div>
  );
}
