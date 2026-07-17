import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function LoginPage() {
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const onChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError(null);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) {
      setError('Please enter your email and password.');
      return;
    }
    setSubmitting(true);
    try {
      const user = await login(form.email.trim(), form.password);
      addToast(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center pt-10 sm:pt-16">
      <div className="card w-full max-w-sm p-7">
        <h1 className="font-heading text-3xl text-ink mb-1">Sign in</h1>
        <p className="text-ink-light text-sm mb-6">Welcome back to Annz Bricks.</p>

        {error && (
          <div className="bg-danger-light text-danger text-sm rounded-card px-3.5 py-2.5 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-light mb-1" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={form.email}
              onChange={onChange('email')}
              placeholder="you@example.com"
              className="input-field"
              autoComplete="email"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-light mb-1" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={form.password}
              onChange={onChange('password')}
              placeholder="Your password"
              className="input-field"
              autoComplete="current-password"
            />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2 !py-3">
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p className="text-ink-light text-sm mt-5 text-center">
          New to Annz Bricks?{' '}
          <Link to="/register" state={location.state} className="text-accent hover:text-accent-hover font-medium">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
