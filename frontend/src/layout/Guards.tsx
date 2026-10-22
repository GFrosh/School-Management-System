import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import type { Role } from '../api/types';
import { Skeleton } from '../components/Skeleton';

/** Guarded route: unauthenticated users go to /login, wrong role to /403. */
export function RequireAuth({ roles }: { roles?: Role[] }) {
  const { me, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ padding: '48px 24px' }}>
        <Skeleton rows={5} />
      </div>
    );
  }
  if (!me) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.some((role) => me.roles.includes(role))) return <Navigate to="/403" replace />;
  return <Outlet />;
}
