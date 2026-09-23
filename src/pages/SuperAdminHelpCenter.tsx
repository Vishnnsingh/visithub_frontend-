import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { DashboardShell } from '../components/layout/DashboardShell';
import { api, getApiErrorMessage } from '../lib/api';

type HelpRow = {
  id: string;
  name: string;
  email: string;
  mobile: string;
  message: string;
  createdAt: string;
};

type HelpPage = {
  items: HelpRow[];
  page: number;
  pages: number;
  total: number;
  limit: number;
};

export function SuperAdminHelpCenter() {
  const [page, setPage] = useState(1);

  const helpQuery = useQuery({
    queryKey: ['admin-help', page],
    queryFn: async () => {
      const response = await api.get('/help', { params: { page, limit: 10 } });
      return response.data.data as HelpPage;
    },
  });

  const data = helpQuery.data;

  return (
    <DashboardShell
      title="Help Center"
      subtitle="Queries submitted from the landing Help chat."
    >
      <section className="overflow-hidden rounded-3xl border border-line bg-card shadow-sm">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold text-ink">Help messages</h2>
          <p className="text-sm text-fog">Name, email, number, problem, and when they wrote.</p>
        </div>

        {helpQuery.isLoading ? (
          <p className="p-6 text-sm text-fog">Loading messages…</p>
        ) : helpQuery.error ? (
          <p className="p-6 text-sm text-danger">{getApiErrorMessage(helpQuery.error)}</p>
        ) : !data || data.items.length === 0 ? (
          <p className="p-8 text-center text-sm text-mute">No help messages yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-bg text-xs tracking-wide text-mute uppercase">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Mobile</th>
                    <th className="px-4 py-3 font-semibold">Problem</th>
                    <th className="px-4 py-3 font-semibold">When</th>
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
                      <td className="px-4 py-3 text-xs text-mute whitespace-nowrap">
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
    </DashboardShell>
  );
}
