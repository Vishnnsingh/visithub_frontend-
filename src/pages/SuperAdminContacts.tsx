import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { DashboardShell } from '../components/layout/DashboardShell';
import { api, getApiErrorMessage } from '../lib/api';
import { cn } from '../lib/cn';

type ContactRow = {
  id: string;
  name: string;
  email: string;
  mobile: string;
  message: string;
  createdAt: string;
};

type ContactPage = {
  items: ContactRow[];
  page: number;
  pages: number;
  total: number;
  limit: number;
};

type ContactInfo = {
  email: string;
  phone: string;
  address: string;
  mapUrl: string;
  mapActive: boolean;
  updatedAt?: string;
};

export function SuperAdminContacts() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showContactModal, setShowContactModal] = useState(false);
  const [form, setForm] = useState<ContactInfo>({
    email: '',
    phone: '',
    address: '',
    mapUrl: '',
    mapActive: false,
  });

  const infoQuery = useQuery({
    queryKey: ['admin-contact-info'],
    queryFn: async () => {
      const response = await api.get('/contact/info');
      return response.data.data as ContactInfo;
    },
  });

  useEffect(() => {
    if (infoQuery.data) {
      setForm({
        email: infoQuery.data.email,
        phone: infoQuery.data.phone,
        address: infoQuery.data.address,
        mapUrl: infoQuery.data.mapUrl || '',
        mapActive: Boolean(infoQuery.data.mapActive),
      });
    }
  }, [infoQuery.data]);

  const saveInfo = useMutation({
    mutationFn: async (payload: ContactInfo) => {
      const response = await api.put('/contact/info', payload);
      return response.data.data as ContactInfo;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['admin-contact-info'], data);
      queryClient.invalidateQueries({ queryKey: ['landing-contact-info'] });
      toast.success('Landing contact details saved');
      setShowContactModal(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const contactsQuery = useQuery({
    queryKey: ['admin-contacts', page],
    queryFn: async () => {
      const response = await api.get('/contact', { params: { page, limit: 10 } });
      return response.data.data as ContactPage;
    },
  });

  const data = contactsQuery.data;
  const closeModal = () => setShowContactModal(false);

  return (
    <DashboardShell
      title="Contact"
      subtitle="Edit landing contact details, map link, and review visitor messages."
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowContactModal(true)}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-deep"
          >
            Landing contact details
          </button>
          {infoQuery.data ? (
            <p className="text-sm text-fog">
              {infoQuery.data.email} · {infoQuery.data.phone}
            </p>
          ) : null}
        </div>

        {showContactModal
          ? createPortal(
              <div
                className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4"
                onClick={closeModal}
              >
                <div
                  className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-line bg-card p-5 shadow-2xl sm:p-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-bold text-ink">Landing contact details</h3>
                      <p className="mt-1 text-sm text-fog">
                        These values show on the public landing Contact section.
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

                  {infoQuery.isLoading ? (
                    <p className="mt-5 text-sm text-fog">Loading…</p>
                  ) : infoQuery.error ? (
                    <p className="mt-5 text-sm text-danger">
                      {getApiErrorMessage(infoQuery.error)}
                    </p>
                  ) : (
                    <form
                      className="mt-5 grid gap-4 sm:grid-cols-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        saveInfo.mutate(form);
                      }}
                    >
                      <label className="block text-sm font-medium text-ink">
                        Email
                        <input
                          required
                          type="email"
                          className="field-input mt-1.5"
                          value={form.email}
                          onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
                        />
                      </label>
                      <label className="block text-sm font-medium text-ink">
                        Phone
                        <input
                          required
                          className="field-input mt-1.5"
                          value={form.phone}
                          onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))}
                        />
                      </label>
                      <label className="block text-sm font-medium text-ink sm:col-span-2">
                        Address
                        <input
                          required
                          className="field-input mt-1.5"
                          value={form.address}
                          onChange={(e) => setForm((c) => ({ ...c, address: e.target.value }))}
                        />
                      </label>
                      <label className="block text-sm font-medium text-ink sm:col-span-2">
                        Map location URL
                        <input
                          className="field-input mt-1.5"
                          placeholder="Paste Google Maps share / embed link"
                          value={form.mapUrl}
                          onChange={(e) => setForm((c) => ({ ...c, mapUrl: e.target.value }))}
                        />
                        <p className="mt-1 text-xs text-mute">
                          Short links (maps.app.goo.gl) are auto-converted on save.
                        </p>
                      </label>

                      <div className="sm:col-span-2">
                        <p className="mb-2 text-sm font-medium text-ink">Map on landing</p>
                        <div className="flex w-fit gap-2 rounded-full bg-bg p-1">
                          <button
                            type="button"
                            className={cn(
                              'rounded-full px-4 py-2 text-sm font-semibold transition',
                              form.mapActive ? 'bg-primary text-white' : 'text-fog hover:text-ink'
                            )}
                            onClick={() => setForm((c) => ({ ...c, mapActive: true }))}
                          >
                            Active
                          </button>
                          <button
                            type="button"
                            className={cn(
                              'rounded-full px-4 py-2 text-sm font-semibold transition',
                              !form.mapActive ? 'bg-primary text-white' : 'text-fog hover:text-ink'
                            )}
                            onClick={() => setForm((c) => ({ ...c, mapActive: false }))}
                          >
                            Inactive
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 sm:col-span-2">
                        <button
                          type="submit"
                          disabled={saveInfo.isPending}
                          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-deep disabled:opacity-60"
                        >
                          {saveInfo.isPending ? 'Saving…' : 'Save contact details'}
                        </button>
                        <button
                          type="button"
                          onClick={closeModal}
                          className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink hover:bg-bg"
                        >
                          Close
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>,
              document.body
            )
          : null}

        <section className="overflow-hidden rounded-3xl border border-line bg-card shadow-sm">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-lg font-semibold text-ink">Contact messages</h2>
            <p className="text-sm text-fog">Messages submitted from the landing form.</p>
          </div>
          {contactsQuery.isLoading ? (
            <p className="p-6 text-sm text-fog">Loading messages…</p>
          ) : contactsQuery.error ? (
            <p className="p-6 text-sm text-danger">{getApiErrorMessage(contactsQuery.error)}</p>
          ) : !data || data.items.length === 0 ? (
            <p className="p-8 text-center text-sm text-mute">No contact messages yet.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-bg text-xs tracking-wide text-mute uppercase">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Mobile</th>
                      <th className="px-4 py-3 font-semibold">Message</th>
                      <th className="px-4 py-3 font-semibold">Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.items.map((row) => (
                      <tr key={row.id} className="align-top hover:bg-bg/60">
                        <td className="px-4 py-3 font-semibold text-ink">{row.name}</td>
                        <td className="px-4 py-3 text-fog">{row.email}</td>
                        <td className="px-4 py-3 text-fog">{row.mobile}</td>
                        <td className="max-w-md px-4 py-3 whitespace-pre-wrap text-ink">
                          {row.message}
                        </td>
                        <td className="px-4 py-3 text-xs text-mute">
                          {new Date(row.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm">
                <p className="text-mute">
                  Page {data.page} of {data.pages} · {data.total} total
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= data.pages}
                    onClick={() => setPage((value) => Math.min(data.pages, value + 1))}
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
