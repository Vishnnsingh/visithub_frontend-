import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, getApiErrorMessage } from '../lib/api';

type LegalPage = {
  slug: string;
  title: string;
  body: string;
  updatedAt: string;
};

export function LegalDocumentPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const slug = pathname.includes('privacy') ? 'privacy' : 'terms';
  const query = useQuery({
    queryKey: ['legal-page', slug],
    queryFn: async () => {
      const response = await api.get(`/legal/${slug}`);
      return response.data.data as LegalPage;
    },
  });

  const close = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/create-account', { replace: true });
  };

  return (
    <div className="app-bg min-h-screen text-text">
      <main className="relative mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <button
          type="button"
          onClick={close}
          className="absolute top-4 right-4 inline-flex size-10 items-center justify-center rounded-full border border-line bg-card text-ink shadow-sm hover:bg-bg sm:top-6 sm:right-6"
          aria-label="Close"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={18} color="currentColor" strokeWidth={1.8} />
        </button>

        {query.isLoading ? (
          <p className="pr-12 text-sm text-mute">Loading…</p>
        ) : query.error ? (
          <div className="pr-12">
            <p className="text-sm text-danger">{getApiErrorMessage(query.error, 'Page not found')}</p>
            <Link to="/create-account" className="mt-4 inline-block text-sm font-semibold text-primary">
              Back to signup
            </Link>
          </div>
        ) : (
          <div className="pr-12">
            <h1 className="text-3xl font-bold tracking-tight text-ink">{query.data?.title}</h1>
            {query.data?.updatedAt ? (
              <p className="mt-2 text-xs text-mute">
                Updated {new Date(query.data.updatedAt).toLocaleString()}
              </p>
            ) : null}
            <div className="mt-8 whitespace-pre-wrap text-sm leading-7 text-ink">
              {query.data?.body?.trim()
                ? query.data.body
                : 'Content is not available yet. Please check back later.'}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
