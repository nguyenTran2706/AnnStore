import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const onChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError(null);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    try {
      const user = await register(form.name.trim(), form.email.trim(), form.password);
      addToast(`Welcome, ${user.name.split(' ')[0]}!`);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.errors?.[0]?.msg ||
          'Registration failed. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center pt-10 sm:pt-16">
      <div className="card w-full max-w-sm p-7">
        <h1 className="font-heading text-3xl text-ink mb-1">Create account</h1>
        <p className="text-ink-light text-sm mb-6">Join Annz Bricks to check out and track orders.</p>

        {error && (
          <div className="bg-danger-light text-danger text-sm rounded-card px-3.5 py-2.5 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-light mb-1" htmlFor="reg-name">
              Name
            </label>
            <input
              id="reg-name"
              type="text"
              value={form.name}
              onChange={onChange('name')}
              placeholder="Your name"
              className="input-field"
              autoComplete="name"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-light mb-1" htmlFor="reg-email">
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              value={form.email}
              onChange={onChange('email')}
              placeholder="you@example.com"
              className="input-field"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-light mb-1" htmlFor="reg-password">
              Password
            </label>
            <input
              id="reg-password"
              type="password"
              value={form.password}
              onChange={onChange('password')}
              placeholder="At least 6 characters"
              className="input-field"
              autoComplete="new-password"
            />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2 !py-3">
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <p className="text-ink-light text-sm mt-5 text-center">
          Already have an account?{' '}
          <Link to="/login" state={location.state} className="text-accent hover:text-accent-hover font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
