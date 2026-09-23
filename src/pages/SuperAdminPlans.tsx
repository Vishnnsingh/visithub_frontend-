import { Add01Icon, Cancel01Icon, Delete02Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { DashboardShell } from '../components/layout/DashboardShell';
import { api, getApiErrorMessage } from '../lib/api';
import { cn } from '../lib/cn';
import { useBusinessTypes } from '../lib/useBusinessTypes';

type Plan = {
  id: string;
  name: string;
  months: number;
  priceInr: number;
  description: string;
  features: string[];
  highlighted: boolean;
  active: boolean;
  sortOrder: number;
};

type PlanForm = {
  name: string;
  months: string;
  priceInr: string;
  description: string;
  featuresText: string;
  highlighted: boolean;
  active: boolean;
};

type InvoiceSettings = {
  supportEmail: string;
  supportWebsite: string;
  updatedAt?: string;
};

type CustomPlanSettings = {
  monthlyPriceInr: number;
  minMonths: number;
  maxMonths: number;
  defaultMonths: number;
  updatedAt?: string;
};

const emptyForm: PlanForm = {
  name: '',
  months: '1',
  priceInr: '500',
  description: '',
  featuresText: '',
  highlighted: false,
  active: true,
};

function formatPrice(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function SuperAdminPlans() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PlanForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showInvoiceSettings, setShowInvoiceSettings] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ supportEmail: '', supportWebsite: '' });
  const [showCustomSettings, setShowCustomSettings] = useState(false);
  const [showBusinessTypeSettings, setShowBusinessTypeSettings] = useState(false);
  const [customForm, setCustomForm] = useState({
    monthlyPriceInr: '499',
    minMonths: '1',
    maxMonths: '60',
    defaultMonths: '1',
  });

  const plansQuery = useQuery({
    queryKey: ['admin-plans'],
    queryFn: async () => {
      const response = await api.get('/plans/admin');
      return response.data.data as Plan[];
    },
  });

  const invoiceQuery = useQuery({
    queryKey: ['admin-invoice-settings'],
    queryFn: async () => {
      const response = await api.get('/plans/invoice-settings');
      return response.data.data as InvoiceSettings;
    },
  });

  const customSettingsQuery = useQuery({
    queryKey: ['admin-custom-plan-settings'],
    queryFn: async () => {
      const response = await api.get('/plans/admin/custom-settings');
      return response.data.data as CustomPlanSettings;
    },
  });

  useEffect(() => {
    if (invoiceQuery.data) {
      setInvoiceForm({
        supportEmail: invoiceQuery.data.supportEmail,
        supportWebsite: invoiceQuery.data.supportWebsite,
      });
    }
  }, [invoiceQuery.data]);

  useEffect(() => {
    if (customSettingsQuery.data) {
      setCustomForm({
        monthlyPriceInr: String(customSettingsQuery.data.monthlyPriceInr),
        minMonths: String(customSettingsQuery.data.minMonths),
        maxMonths: String(customSettingsQuery.data.maxMonths),
        defaultMonths: String(customSettingsQuery.data.defaultMonths),
      });
    }
  }, [customSettingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        months: Number(form.months),
        priceInr: Number(form.priceInr),
        description: form.description.trim(),
        features: form.featuresText
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        highlighted: form.highlighted,
        active: form.active,
      };
      if (editingId) {
        const response = await api.patch(`/plans/admin/${editingId}`, payload);
        return response.data.data as Plan;
      }
      const response = await api.post('/plans/admin', payload);
      return response.data.data as Plan;
    },
    onSuccess: () => {
      toast.success(editingId ? 'Plan updated' : 'Plan created');
      setForm(emptyForm);
      setEditingId(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      void queryClient.invalidateQueries({ queryKey: ['public-plans'] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not save plan')),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/plans/admin/${id}`);
    },
    onSuccess: () => {
      toast.success('Plan deleted');
      void queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      void queryClient.invalidateQueries({ queryKey: ['public-plans'] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not delete plan')),
  });

  const invoiceSaveMutation = useMutation({
    mutationFn: async () => {
      const response = await api.put('/plans/invoice-settings', {
        supportEmail: invoiceForm.supportEmail.trim(),
        supportWebsite: invoiceForm.supportWebsite.trim(),
      });
      return response.data.data as InvoiceSettings;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['admin-invoice-settings'], data);
      toast.success('Invoice support details saved');
      setShowInvoiceSettings(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not save invoice settings')),
  });

  const customSaveMutation = useMutation({
    mutationFn: async () => {
      const response = await api.put('/plans/admin/custom-settings', {
        monthlyPriceInr: Number(customForm.monthlyPriceInr),
        minMonths: Number(customForm.minMonths),
        maxMonths: Number(customForm.maxMonths),
        defaultMonths: Number(customForm.defaultMonths),
      });
      return response.data.data as CustomPlanSettings;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['admin-custom-plan-settings'], data);
      void queryClient.invalidateQueries({ queryKey: ['custom-plan-settings'] });
      toast.success('Custom plan settings saved');
      setShowCustomSettings(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not save custom plan settings')),
  });

  const startEdit = (plan: Plan) => {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      months: String(plan.months),
      priceInr: String(plan.priceInr),
      description: plan.description || '',
      featuresText: (plan.features || []).join('\n'),
      highlighted: plan.highlighted,
      active: plan.active,
    });
  };

  return (
    <DashboardShell
      title="Subscription plans"
      subtitle="Set monthly, 6-month, yearly, or custom-duration plans. Active plans appear on the public landing page."
    >
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setShowInvoiceSettings(true)}
          className="rounded-3xl border border-line bg-card p-5 text-left shadow-sm transition hover:border-primary/35 hover:shadow-md"
        >
          <h2 className="text-base font-semibold text-ink">Invoice support details</h2>
          <p className="mt-1 text-xs text-fog">Need Help? email & website on invoices</p>
          {invoiceQuery.data ? (
            <p className="mt-3 truncate text-sm text-ink">
              {invoiceQuery.data.supportEmail} · {invoiceQuery.data.supportWebsite}
            </p>
          ) : (
            <p className="mt-3 text-sm text-mute">Tap to set</p>
          )}
        </button>

        <button
          type="button"
          onClick={() => setShowCustomSettings(true)}
          className="rounded-3xl border border-line bg-card p-5 text-left shadow-sm transition hover:border-primary/35 hover:shadow-md"
        >
          <h2 className="text-base font-semibold text-ink">Custom plan pricing</h2>
          <p className="mt-1 text-xs text-fog">Global ₹/month + month range</p>
          {customSettingsQuery.data ? (
            <p className="mt-3 text-sm text-ink">
              ₹{customSettingsQuery.data.monthlyPriceInr}/mo · {customSettingsQuery.data.minMonths}–
              {customSettingsQuery.data.maxMonths} months
            </p>
          ) : (
            <p className="mt-3 text-sm text-mute">Tap to set</p>
          )}
        </button>

        <button
          type="button"
          onClick={() => setShowBusinessTypeSettings(true)}
          className="rounded-3xl border border-line bg-card p-5 text-left shadow-sm transition hover:border-primary/35 hover:shadow-md"
        >
          <h2 className="text-base font-semibold text-ink">Business type plan prices</h2>
          <p className="mt-1 text-xs text-fog">School, College, … per-type prices</p>
          <p className="mt-3 text-sm text-mute">Tap to set by business type</p>
        </button>
      </div>

      {showInvoiceSettings
        ? createPortal(
            <div
              className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4"
              onClick={() => setShowInvoiceSettings(false)}
            >
              <div
                className="w-full max-w-lg rounded-3xl border border-line bg-card p-5 shadow-2xl sm:p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-ink">Invoice support details</h3>
                    <p className="mt-1 text-sm text-fog">
                      Email and website shown in the “Need Help?” box on downloaded invoices.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInvoiceSettings(false)}
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-bg"
                  >
                    Close
                  </button>
                </div>
                <form
                  className="mt-5 grid gap-4 sm:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    invoiceSaveMutation.mutate();
                  }}
                >
                  <label className="block text-sm font-medium text-ink sm:col-span-2">
                    Support email
                    <input
                      required
                      type="email"
                      className="field-input mt-1.5"
                      value={invoiceForm.supportEmail}
                      onChange={(e) =>
                        setInvoiceForm((c) => ({ ...c, supportEmail: e.target.value }))
                      }
                      placeholder="support@visithub.in"
                    />
                  </label>
                  <label className="block text-sm font-medium text-ink sm:col-span-2">
                    Website
                    <input
                      required
                      className="field-input mt-1.5"
                      value={invoiceForm.supportWebsite}
                      onChange={(e) =>
                        setInvoiceForm((c) => ({ ...c, supportWebsite: e.target.value }))
                      }
                      placeholder="www.visithub.in"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2 sm:col-span-2">
                    <button
                      type="submit"
                      disabled={invoiceSaveMutation.isPending}
                      className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-deep disabled:opacity-60"
                    >
                      {invoiceSaveMutation.isPending ? 'Saving…' : 'Save invoice details'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowInvoiceSettings(false)}
                      className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink hover:bg-bg"
                    >
                      Close
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}

      {showCustomSettings
        ? createPortal(
            <div
              className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4"
              onClick={() => setShowCustomSettings(false)}
            >
              <div
                className="w-full max-w-lg rounded-3xl border border-line bg-card p-5 shadow-2xl sm:p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-ink">Custom plan pricing</h3>
                    <p className="mt-1 text-sm text-fog">
                      Global default for Custom purchases (month range + ₹/month).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCustomSettings(false)}
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-bg"
                  >
                    Close
                  </button>
                </div>
                <form
                  className="mt-5 grid gap-4 sm:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    customSaveMutation.mutate();
                  }}
                >
                  <label className="block text-sm font-medium text-ink">
                    Price per month (₹)
                    <input
                      required
                      type="number"
                      min={0}
                      className="field-input mt-1.5"
                      value={customForm.monthlyPriceInr}
                      onChange={(e) =>
                        setCustomForm((c) => ({ ...c, monthlyPriceInr: e.target.value }))
                      }
                      placeholder="499"
                    />
                  </label>
                  <label className="block text-sm font-medium text-ink">
                    Default months
                    <input
                      required
                      type="number"
                      min={1}
                      className="field-input mt-1.5"
                      value={customForm.defaultMonths}
                      onChange={(e) =>
                        setCustomForm((c) => ({ ...c, defaultMonths: e.target.value }))
                      }
                      placeholder="1"
                    />
                  </label>
                  <label className="block text-sm font-medium text-ink">
                    Min months (− floor)
                    <input
                      required
                      type="number"
                      min={1}
                      className="field-input mt-1.5"
                      value={customForm.minMonths}
                      onChange={(e) => setCustomForm((c) => ({ ...c, minMonths: e.target.value }))}
                      placeholder="1"
                    />
                  </label>
                  <label className="block text-sm font-medium text-ink">
                    Max months (+ ceiling)
                    <input
                      required
                      type="number"
                      min={1}
                      className="field-input mt-1.5"
                      value={customForm.maxMonths}
                      onChange={(e) => setCustomForm((c) => ({ ...c, maxMonths: e.target.value }))}
                      placeholder="60"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2 sm:col-span-2">
                    <button
                      type="submit"
                      disabled={customSaveMutation.isPending}
                      className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-deep disabled:opacity-60"
                    >
                      {customSaveMutation.isPending ? 'Saving…' : 'Save custom plan settings'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomSettings(false)}
                      className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink hover:bg-bg"
                    >
                      Close
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}

      {showBusinessTypeSettings
        ? createPortal(
            <div
              className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4"
              onClick={() => setShowBusinessTypeSettings(false)}
            >
              <div
                className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-line bg-card p-5 shadow-2xl sm:p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-ink">Business type plan prices</h3>
                    <p className="mt-1 text-sm text-fog">
                      Tap a business type to set Custom / 1 Month / 6 Months / 1 Year.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBusinessTypeSettings(false)}
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-bg"
                  >
                    Close
                  </button>
                </div>
                <BusinessTypePlanPricingCard
                  catalogPlans={(plansQuery.data || []).filter(
                    (p) => p.months > 0 && p.priceInr >= 0
                  )}
                  globalMonthly={customSettingsQuery.data?.monthlyPriceInr ?? 499}
                  embedded
                />
              </div>
            </div>,
            document.body
          )
        : null}

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-3xl border border-line bg-card p-5 shadow-[0_12px_40px_rgba(17,24,39,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">{editingId ? 'Edit plan' : 'Add plan'}</h2>
            {editingId ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm text-mute hover:text-ink"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} color="currentColor" strokeWidth={1.8} />
                Cancel
              </button>
            ) : null}
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-ink">
              Plan name
              <input
                className="field-input mt-1.5"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="6 Months"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-ink">
                Months
                <input
                  className="field-input mt-1.5"
                  type="number"
                  min={0}
                  value={form.months}
                  onChange={(event) => setForm((current) => ({ ...current, months: event.target.value }))}
                  placeholder="1 / 6 / 12"
                />
              </label>
              <label className="block text-sm font-medium text-ink">
                Price (₹)
                <input
                  className="field-input mt-1.5"
                  type="number"
                  min={0}
                  value={form.priceInr}
                  onChange={(event) => setForm((current) => ({ ...current, priceInr: event.target.value }))}
                  placeholder="500"
                />
              </label>
            </div>
            <label className="block text-sm font-medium text-ink">
              Description
              <textarea
                className="field-input mt-1.5 min-h-20 resize-y"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Short plan summary"
              />
            </label>
            <label className="block text-sm font-medium text-ink">
              Features (one per line)
              <textarea
                className="field-input mt-1.5 min-h-28 resize-y"
                value={form.featuresText}
                onChange={(event) => setForm((current) => ({ ...current, featuresText: event.target.value }))}
                placeholder={'QR visitor check-in\nTickets & meetings\nStaff accounts'}
              />
            </label>
            <div className="flex flex-wrap gap-4 pt-1 text-sm">
              <label className="inline-flex items-center gap-2 text-ink">
                <input
                  type="checkbox"
                  checked={form.highlighted}
                  onChange={(event) => setForm((current) => ({ ...current, highlighted: event.target.checked }))}
                />
                Highlight on landing
              </label>
              <label className="inline-flex items-center gap-2 text-ink">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
                />
                Active (public)
              </label>
            </div>
            <button
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-deep disabled:opacity-60"
            >
              <HugeiconsIcon icon={editingId ? Tick02Icon : Add01Icon} size={16} color="currentColor" strokeWidth={2} />
              {saveMutation.isPending ? 'Saving...' : editingId ? 'Update plan' : 'Add plan'}
            </button>
          </div>
        </section>

        <section className="space-y-3">
          {plansQuery.isLoading ? (
            <p className="text-sm text-mute">Loading plans...</p>
          ) : plansQuery.error ? (
            <p className="text-sm text-danger">{getApiErrorMessage(plansQuery.error)}</p>
          ) : (plansQuery.data || []).length === 0 ? (
            <div className="rounded-3xl border border-dashed border-line bg-card p-8 text-center text-sm text-mute">
              No plans yet. Add 1 month, 6 months, 1 year, or any custom duration.
            </div>
          ) : (
            (plansQuery.data || []).map((plan) => (
              <article key={plan.id} className="rounded-3xl border border-line bg-card p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-ink">{plan.name}</h3>
                      <span className="rounded-full bg-bg px-2.5 py-0.5 text-xs font-medium text-mute">
                        {plan.months} mo
                      </span>
                      {plan.highlighted ? (
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          Highlighted
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-medium',
                          plan.active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                        )}
                      >
                        {plan.active ? 'Active' : 'Hidden'}
                      </span>
                    </div>
                    <p className="mt-1 text-2xl font-bold text-primary">{formatPrice(plan.priceInr)}</p>
                    <p className="mt-1 text-sm text-fog">{plan.description || '—'}</p>
                    <ul className="mt-3 space-y-1 text-sm text-fog">
                      {(plan.features || []).map((feature) => (
                        <li key={feature}>• {feature}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(plan)}
                      className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-bg"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(plan.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-danger/20 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/5"
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={15} color="currentColor" strokeWidth={1.8} />
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </DashboardShell>
  );
}

const PRESET_MONTHS = [1, 6, 12] as const;

type BusinessTypePricingView = {
  businessType: string;
  monthlyPriceInr: number | null;
  effectiveMonthlyPriceInr: number;
  globalMonthlyPriceInr: number;
  catalogPlanPrices: Array<{
    planId: string;
    name: string;
    months: number;
    globalPriceInr: number;
    typePriceInr: number | null;
    effectivePriceInr: number;
  }>;
};

function BusinessTypePlanPricingCard({
  catalogPlans,
  globalMonthly,
  embedded = false,
}: {
  catalogPlans: Plan[];
  globalMonthly: number;
  embedded?: boolean;
}) {
  const queryClient = useQueryClient();
  const { types: businessTypes } = useBusinessTypes();
  const [openType, setOpenType] = useState<string | null>(null);
  const [customMonthly, setCustomMonthly] = useState('');
  const [useGlobalCustom, setUseGlobalCustom] = useState(true);
  const [priceByPlanId, setPriceByPlanId] = useState<Record<string, string>>({});

  const summaryQueries = useQueries({
    queries: businessTypes.map((type) => ({
      queryKey: ['business-type-pricing', type],
      queryFn: async () => {
        const response = await api.get('/plans/admin/business-type-pricing', {
          params: { businessType: type },
        });
        return response.data.data as BusinessTypePricingView;
      },
      staleTime: 30_000,
      enabled: businessTypes.length > 0,
    })),
  });

  const summaryByType = useMemo(() => {
    const map = new Map<string, BusinessTypePricingView>();
    businessTypes.forEach((type, index) => {
      const data = summaryQueries[index]?.data;
      if (data) map.set(type, data);
    });
    return map;
  }, [summaryQueries, businessTypes]);

  const pricingQuery = useQuery({
    queryKey: ['business-type-pricing', openType],
    queryFn: async () => {
      const response = await api.get('/plans/admin/business-type-pricing', {
        params: { businessType: openType },
      });
      return response.data.data as BusinessTypePricingView;
    },
    enabled: Boolean(openType),
  });

  const presetPlans = useMemo(() => {
    const byMonths = new Map<number, Plan>();
    for (const plan of catalogPlans) {
      if ((PRESET_MONTHS as readonly number[]).includes(plan.months) && !byMonths.has(plan.months)) {
        byMonths.set(plan.months, plan);
      }
    }
    return PRESET_MONTHS.map((m) => byMonths.get(m)).filter(Boolean) as Plan[];
  }, [catalogPlans]);

  useEffect(() => {
    if (!pricingQuery.data || !openType) return;
    const detail = pricingQuery.data;
    setUseGlobalCustom(detail.monthlyPriceInr == null);
    setCustomMonthly(String(detail.effectiveMonthlyPriceInr ?? globalMonthly));
    const next: Record<string, string> = {};
    for (const row of detail.catalogPlanPrices || []) {
      next[row.planId] = String(row.effectivePriceInr);
    }
    setPriceByPlanId(next);
  }, [pricingQuery.data, globalMonthly, openType]);

  const closeModal = () => setOpenType(null);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!openType) throw new Error('Select a business type');
      const planPrices: Record<string, number | null> = {};
      for (const plan of presetPlans) {
        const raw = (priceByPlanId[plan.id] || '').trim();
        if (!raw) {
          planPrices[plan.id] = null;
          continue;
        }
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) throw new Error(`Invalid price for ${plan.name}`);
        planPrices[plan.id] = n;
      }
      const response = await api.put('/plans/admin/business-type-pricing', {
        businessType: openType,
        useGlobalMonthly: useGlobalCustom,
        monthlyPriceInr: useGlobalCustom ? null : Number(customMonthly),
        planPrices,
      });
      return response.data.data as BusinessTypePricingView;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['business-type-pricing', openType], data);
      void queryClient.invalidateQueries({ queryKey: ['public-plans'] });
      void queryClient.invalidateQueries({ queryKey: ['custom-plan-settings'] });
      toast.success(`Prices saved for ${openType}`);
      closeModal();
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not save prices')),
  });

  const typeGrid =
    businessTypes.length === 0 ? (
      <p className="text-sm text-mute">
        No business types yet. Add them from sidebar → Add Business Type.
      </p>
    ) : (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {businessTypes.map((type) => {
        const summary = summaryByType.get(type);
        const hasCustom = summary?.monthlyPriceInr != null;
        const catalogSet = (summary?.catalogPlanPrices || []).filter((p) => p.typePriceInr != null);
        const isConfigured = hasCustom || catalogSet.length > 0;
        const month1 = summary?.catalogPlanPrices?.find((p) => p.months === 1);
        const month6 = summary?.catalogPlanPrices?.find((p) => p.months === 6);
        const month12 = summary?.catalogPlanPrices?.find((p) => p.months === 12);

        return (
          <button
            key={type}
            type="button"
            onClick={() => setOpenType(type)}
            className={cn(
              'rounded-2xl border px-4 py-3.5 text-left transition',
              isConfigured
                ? 'border-primary/35 bg-primary/5 hover:border-primary/55'
                : 'border-line bg-bg hover:border-primary/30 hover:bg-white'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-ink">{type}</p>
              {isConfigured ? (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">
                  Set
                </span>
              ) : (
                <span className="rounded-full bg-fog/15 px-2 py-0.5 text-[10px] font-semibold text-mute">
                  Default
                </span>
              )}
            </div>
            {isConfigured ? (
              <div className="mt-2 space-y-0.5 text-[11px] leading-4 text-fog">
                <p>
                  Custom{' '}
                  <span className="font-semibold text-ink">
                    {formatPrice(summary?.effectiveMonthlyPriceInr ?? globalMonthly)}/mo
                  </span>
                </p>
                <p>
                  1 mo {formatPrice(month1?.effectivePriceInr ?? 0)} · 6 mo{' '}
                  {formatPrice(month6?.effectivePriceInr ?? 0)} · 1 yr{' '}
                  {formatPrice(month12?.effectivePriceInr ?? 0)}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-mute">Tap to set plan prices</p>
            )}
          </button>
        );
      })}
    </div>
    );

  const pricingModal =
    openType
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
            onClick={closeModal}
          >
            <div
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-line bg-card p-5 shadow-2xl sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-mute uppercase">
                    Business type prices
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-ink">{openType}</h3>
                  <p className="mt-1 text-sm text-fog">
                    Shown on Choose plan & Organisation Plan for this type.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-bg"
                >
                  Close
                </button>
              </div>

              {pricingQuery.isLoading ? (
                <p className="mt-6 text-sm text-mute">Loading…</p>
              ) : pricingQuery.error ? (
                <p className="mt-6 text-sm text-danger">{getApiErrorMessage(pricingQuery.error)}</p>
              ) : (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-line bg-bg p-4">
                    <p className="text-sm font-semibold text-ink">Custom (per month)</p>
                    <p className="mt-1 text-xs text-mute">
                      Global default {formatPrice(globalMonthly)}/month
                      {pricingQuery.data?.monthlyPriceInr != null ? (
                        <span className="text-ink">
                          {' '}
                          · currently set {formatPrice(pricingQuery.data.monthlyPriceInr)}/mo
                        </span>
                      ) : null}
                    </p>
                    <label className="mt-3 flex items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={useGlobalCustom}
                        onChange={(e) => setUseGlobalCustom(e.target.checked)}
                      />
                      Use global custom monthly rate
                    </label>
                    {!useGlobalCustom ? (
                      <label className="mt-3 block text-sm font-medium text-ink">
                        Custom ₹ / month
                        <input
                          type="number"
                          min={0}
                          className="field-input mt-1.5"
                          value={customMonthly}
                          onChange={(e) => setCustomMonthly(e.target.value)}
                          placeholder={String(globalMonthly)}
                        />
                      </label>
                    ) : null}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {presetPlans.length === 0 ? (
                      <p className="text-sm text-mute sm:col-span-3">
                        Add active 1 / 6 / 12 month plans first.
                      </p>
                    ) : (
                      presetPlans.map((plan) => {
                        const row = pricingQuery.data?.catalogPlanPrices?.find(
                          (p) => p.planId === plan.id
                        );
                        return (
                          <label
                            key={plan.id}
                            className="block rounded-2xl border border-line bg-bg p-4 text-sm"
                          >
                            <span className="font-semibold text-ink">{plan.name}</span>
                            <span className="mt-0.5 block text-xs text-mute">
                              Global {formatPrice(plan.priceInr)}
                              {row?.typePriceInr != null ? (
                                <> · set {formatPrice(row.typePriceInr)}</>
                              ) : null}
                            </span>
                            <span className="mt-3 block font-medium text-ink">
                              Price (₹)
                              <input
                                type="number"
                                min={0}
                                className="field-input mt-1.5"
                                value={priceByPlanId[plan.id] ?? String(plan.priceInr)}
                                onChange={(e) =>
                                  setPriceByPlanId((c) => ({ ...c, [plan.id]: e.target.value }))
                                }
                                placeholder={String(plan.priceInr)}
                              />
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      disabled={saveMutation.isPending}
                      onClick={() => saveMutation.mutate()}
                      className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-deep disabled:opacity-60"
                    >
                      {saveMutation.isPending ? 'Saving…' : 'Save prices'}
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink hover:bg-bg"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  if (embedded) {
    return (
      <>
        {typeGrid}
        {pricingModal}
      </>
    );
  }

  return (
    <div className="mb-6 rounded-3xl border border-line bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-ink">Business type plan prices</h2>
        <p className="mt-1 text-sm text-fog">
          Tap a business type to set Custom / 1 Month / 6 Months / 1 Year. Orgs of that type see
          these on Choose plan and Plan page.
        </p>
      </div>
      {typeGrid}
      {pricingModal}
    </div>
  );
}
