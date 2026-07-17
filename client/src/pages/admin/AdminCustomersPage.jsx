import { useState, useEffect } from 'react';
import * as api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const roleBadge = (role) =>
  role === 'admin'
    ? 'badge bg-accent-light text-accent'
    : 'badge bg-bg-alt text-ink-light border border-border';

const joined = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export default function AdminCustomersPage() {
  const { user: me } = useAuth();
  const { addToast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmRoleId, setConfirmRoleId] = useState(null);
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    api
      .fetchAdminCustomers()
      .then(setCustomers)
      .catch(() => addToast('Failed to load customers', 'error'))
      .finally(() => setLoading(false));
  }, [addToast]);

  const changeRole = async (c) => {
    if (confirmRoleId !== c._id) {
      setConfirmRoleId(c._id);
      setTimeout(() => setConfirmRoleId((id) => (id === c._id ? null : id)), 3000);
      return;
    }
    setSavingId(c._id);
    try {
      const updated = await api.updateCustomerRole(c._id, c.role === 'admin' ? 'customer' : 'admin');
      // Merge only the role — the PATCH response has no orderCount/totalSpent
      setCustomers((prev) => prev.map((u) => (u._id === updated._id ? { ...u, role: updated.role } : u)));
      addToast(`${updated.name} is now ${updated.role === 'admin' ? 'an admin' : 'a customer'}`);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update role', 'error');
    } finally {
      setSavingId(null);
      setConfirmRoleId(null);
    }
  };

  const RoleAction = ({ c }) =>
    c._id === me.id ? (
      <span className="text-xs text-ink-faint">You</span>
    ) : (
      <button
        onClick={() => changeRole(c)}
        disabled={savingId === c._id}
        className={`text-xs px-2.5 py-1 rounded-card transition-all duration-150 ${
          confirmRoleId === c._id
            ? 'bg-danger text-white'
            : 'btn-ghost !px-2.5 !py-1'
        }`}
      >
        {confirmRoleId === c._id ? 'Confirm' : c.role === 'admin' ? 'Make customer' : 'Make admin'}
      </button>
    );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 bg-bg-alt rounded animate-pulse" />
        <div className="card h-64 animate-pulse" />
      </div>
    );
  }

  return (
    <section>
      <h1 className="font-heading text-3xl text-ink mb-1">Customers</h1>
      <p className="text-ink-light text-sm mb-5">Registered accounts, order activity, and roles</p>

      <div className="card overflow-hidden">
        {/* desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-alt/30">
                {['Name', 'Email', 'Role', 'Joined', 'Orders', 'Spent', ''].map((h, i) => (
                  <th
                    key={i}
                    className={`px-4 py-3 font-medium text-ink-light text-xs uppercase tracking-wider ${
                      h === 'Spent' || h === '' ? 'text-right' : ''
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {customers.map((c) => (
                <tr key={c._id} className="hover:bg-bg-alt/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                  <td className="px-4 py-3 text-ink-light">{c.email}</td>
                  <td className="px-4 py-3">
                    <span className={`${roleBadge(c.role)} capitalize`}>{c.role}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-light">{joined(c.createdAt)}</td>
                  <td className="px-4 py-3 text-ink tabular-nums">{c.orderCount}</td>
                  <td className="px-4 py-3 text-ink text-right tabular-nums">${c.totalSpent.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <RoleAction c={c} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* mobile list */}
        <div className="md:hidden divide-y divide-border/60">
          {customers.map((c) => (
            <div key={c._id} className="p-4 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-ink text-sm truncate">{c.name}</p>
                <span className={`${roleBadge(c.role)} capitalize flex-shrink-0`}>{c.role}</span>
              </div>
              <p className="text-xs text-ink-light truncate">{c.email}</p>
              <div className="flex items-center justify-between text-xs text-ink-faint">
                <span>
                  Joined {joined(c.createdAt)} · {c.orderCount} order{c.orderCount !== 1 ? 's' : ''} ·{' '}
                  <span className="tabular-nums">${c.totalSpent.toFixed(2)}</span>
                </span>
                <RoleAction c={c} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
