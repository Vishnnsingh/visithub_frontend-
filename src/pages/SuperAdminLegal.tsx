import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { DashboardShell } from '../components/layout/DashboardShell';
import { api, getApiErrorMessage } from '../lib/api';

type LegalPage = {
  slug: 'terms' | 'privacy';
  title: string;
  body: string;
  updatedAt: string;
};

const SLUG_LABEL: Record<LegalPage['slug'], string> = {
  terms: 'Terms and conditions',
  privacy: 'Privacy policy',
};

export function SuperAdminLegal() {
  const queryClient = useQueryClient();
  const [editSlug, setEditSlug] = useState<LegalPage['slug'] | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [confirmClear, setConfirmClear] = useState<LegalPage['slug'] | null>(null);

  const listQuery = useQuery({
    queryKey: ['admin-legal-pages'],
    queryFn: async () => {
      const response = await api.get('/legal/admin/list');
      return (response.data.data as { pages: LegalPage[] }).pages;
    },
  });

  const pages = listQuery.data || [];

  useEffect(() => {
    if (!editSlug) return;
    const page = pages.find((p) => p.slug === editSlug);
    if (!page) return;
    setTitle(page.title);
    setBody(page.body);
  }, [editSlug, pages]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editSlug) throw new Error('No page selected');
      const response = await api.put(`/legal/admin/${editSlug}`, { title, body });
      return response.data.data as LegalPage;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['admin-legal-pages'], (prev: LegalPage[] | undefined) =>
        (prev || []).map((p) => (p.slug === data.slug ? data : p))
      );
      void queryClient.invalidateQueries({ queryKey: ['legal-page', data.slug] });
      toast.success('Saved');
      setEditSlug(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not save')),
  });

  const clearMutation = useMutation({
    mutationFn: async (slug: LegalPage['slug']) => {
      const response = await api.delete(`/legal/admin/${slug}`);
      return response.data.data as LegalPage;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['admin-legal-pages'], (prev: LegalPage[] | undefined) =>
        (prev || []).map((p) => (p.slug === data.slug ? data : p))
      );
      void queryClient.invalidateQueries({ queryKey: ['legal-page', data.slug] });
      toast.success('Content cleared');
      setConfirmClear(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not clear')),
  });

  return (
    <DashboardShell
      title="Terms & Policy"
      subtitle="Edit Terms and conditions and Privacy policy shown on signup."
    >
      <div className="overflow-hidden rounded-3xl border border-line bg-card shadow-sm">
        {listQuery.isLoading ? (
          <p className="p-6 text-sm text-mute">Loading…</p>
        ) : listQuery.error ? (
          <p className="p-6 text-sm text-danger">{getApiErrorMessage(listQuery.error)}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-bg text-xs tracking-wide text-mute uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Page</th>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Updated</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.slug} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{SLUG_LABEL[page.slug]}</td>
                  <td className="px-4 py-3 text-fog">{page.title}</td>
                  <td className="px-4 py-3 text-xs text-mute">
                    {new Date(page.updatedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        to={`/${page.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-bg"
                      >
                        Open
                      </Link>
                      <button
                        type="button"
                        onClick={() => setEditSlug(page.slug)}
                        className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-bg"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClear(page.slug)}
                        className="rounded-full border border-danger/25 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/5"
                      >
                        Delete content
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editSlug
        ? createPortal(
            <div
              className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4"
              onClick={() => setEditSlug(null)}
            >
              <div
                className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-line bg-card p-5 shadow-2xl sm:p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-xl font-bold text-ink">Edit {SLUG_LABEL[editSlug]}</h3>
                  <button
                    type="button"
                    onClick={() => setEditSlug(null)}
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-bg"
                  >
                    Close
                  </button>
                </div>
                <label className="mt-5 block text-sm font-medium text-ink">
                  Title
                  <input
                    className="field-input mt-1.5"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={120}
                  />
                </label>
                <label className="mt-4 block text-sm font-medium text-ink">
                  Content
                  <textarea
                    className="field-input mt-1.5 min-h-64 resize-y"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write terms / policy content…"
                  />
                </label>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saveMutation.isPending}
                    onClick={() => saveMutation.mutate()}
                    className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-deep disabled:opacity-60"
                  >
                    {saveMutation.isPending ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditSlug(null)}
                    className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink hover:bg-bg"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {confirmClear
        ? createPortal(
            <div
              className="fixed inset-0 z-[95] flex items-center justify-center bg-black/45 p-4"
              onClick={() => setConfirmClear(null)}
            >
              <div
                className="w-full max-w-md rounded-3xl border border-line bg-card p-5 shadow-2xl sm:p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold text-ink">Clear content?</h3>
                <p className="mt-2 text-sm text-fog">
                  This removes the body text for {SLUG_LABEL[confirmClear]}. Title stays; you can
                  edit again anytime.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={clearMutation.isPending}
                    onClick={() => clearMutation.mutate(confirmClear)}
                    className="rounded-full bg-danger px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {clearMutation.isPending ? 'Clearing…' : 'Delete content'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(null)}
                    className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink hover:bg-bg"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </DashboardShell>
  );
}
