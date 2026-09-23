import { Navigate, useParams } from 'react-router-dom';
import { homePath } from '../../lib/auth';
import { orgPath } from '../../lib/orgRoutes';
import { useActiveOrgAuth } from '../../lib/useActiveOrgAuth';

/** Redirect legacy flat org URLs to /admin/:userId/... */
export function OrgLegacyRedirect({ page }: { page: string }) {
  const { user } = useActiveOrgAuth();
  const { id } = useParams();

  if (!user) return <Navigate to="/login" replace />;

  if (page === '/qr-codes' && id) {
    return <Navigate to={`${orgPath(user.id, '/qr-codes')}/${id}`} replace />;
  }

  return <Navigate to={page === '/admin' ? homePath(user) : orgPath(user.id, page)} replace />;
}
