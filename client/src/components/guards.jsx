import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AuthSpinner() {
  return (
    <div className="flex justify-center py-24">
      <svg className="animate-spin h-6 w-6 text-accent" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
}

/* Redirects are imperative (useEffect + navigate) rather than <Navigate>:
   the page-transition AnimatePresence retains exiting subtrees, and a
   retained <Navigate> re-fires on every router update, causing a
   navigation loop that corrupts location.state. An effect runs once. */

export function RequireAuth() {
  const { user, initializing } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const redirect = !initializing && !user;

  useEffect(() => {
    if (redirect) navigate('/login', { state: { from: location }, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redirect]);

  if (initializing) return <AuthSpinner />;
  if (!user) return null;
  return <Outlet />;
}

export function RequireAdmin() {
  const { user, initializing } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const target = initializing ? null : !user ? '/login' : user.role !== 'admin' ? '/' : null;

  useEffect(() => {
    if (target === '/login') navigate('/login', { state: { from: location }, replace: true });
    else if (target) navigate(target, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  if (initializing) return <AuthSpinner />;
  if (target) return null;
  return <Outlet />;
}
