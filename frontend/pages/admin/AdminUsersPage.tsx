import React, { useEffect, useState } from 'react';
import { Search, MoreVertical, UserX, Key, Eye } from 'lucide-react';
import { adminApi } from '../../apiClient';
import { DataTable } from '../../components/admin/DataTable';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { ConfirmModal } from '../../components/admin/ConfirmModal';
import { useToast } from '../../context/ToastContext';
import { Skeleton } from '../../components/admin/Skeleton';

interface UserRow {
  id: number;
  email: string;
  full_name: string;
  role: string;
  status: string;
  is_locked?: boolean;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [actionUser, setActionUser] = useState<UserRow | null>(null);
  const [confirmLock, setConfirmLock] = useState<{ user: UserRow; lock: boolean } | null>(null);
  const [lockLoading, setLockLoading] = useState(false);
  const { addToast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers();
      const list = (res.data as any)?.users ?? (Array.isArray(res.data) ? res.data : []);
      setUsers(list);
    } catch {
      setUsers([]);
      addToast('error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      (u.email && u.email.toLowerCase().includes(search.toLowerCase())) ||
      (u.full_name && u.full_name.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = !filterStatus || u.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleLock = async () => {
    if (!confirmLock) return;
    setLockLoading(true);
    try {
      await adminApi.lockUser(confirmLock.user.id, confirmLock.lock);
      addToast('success', confirmLock.lock ? 'User locked' : 'User unlocked');
      setConfirmLock(null);
      setActionUser(null);
      fetchUsers();
    } catch {
      addToast('error', 'Action failed');
    } finally {
      setLockLoading(false);
    }
  };

  const columns = [
    {
      key: 'email',
      header: 'Email',
      render: (row: UserRow) => (
        <span className="font-medium text-slate-900 dark:text-white">{row.email}</span>
      ),
    },
    { key: 'full_name', header: 'Name', render: (row: UserRow) => row.full_name || '—' },
    {
      key: 'role',
      header: 'Role',
      render: (row: UserRow) => (
        <StatusBadge label={row.role} variant={row.role === 'super_admin' ? 'info' : 'neutral'} />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: UserRow) => (
        <StatusBadge
          label={row.is_locked ? 'Locked' : row.status}
          variant={row.is_locked ? 'error' : row.status === 'approved' ? 'success' : 'warning'}
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      render: (row: UserRow) => (
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActionUser(actionUser && actionUser.id === row.id ? null : row);
            }}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {actionUser && actionUser.id === row.id && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setActionUser(null)}
                aria-hidden
              />
              <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl z-50 py-2">
                <button
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  onClick={() => setActionUser(null)}
                >
                  <Eye className="h-4 w-4" /> View
                </button>
                <button
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  onClick={() => {
                    setConfirmLock({ user: row, lock: !row.is_locked });
                    setActionUser(null);
                  }}
                >
                  <UserX className="h-4 w-4" /> {row.is_locked ? 'Unlock' : 'Lock'}
                </button>
                <button
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  onClick={() => setActionUser(null)}
                >
                  <Key className="h-4 w-4" /> Reset Password
                </button>
              </div>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Users</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search users"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm w-48"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={(row) => row.id}
          emptyMessage="No users found"
        />
      )}

      <ConfirmModal
        open={!!confirmLock}
        onClose={() => setConfirmLock(null)}
        onConfirm={handleLock}
        title={confirmLock ? (confirmLock.lock ? 'Lock user?' : 'Unlock user?') : ''}
        message={
          confirmLock
            ? (confirmLock.lock ? 'Lock' : 'Unlock') +
              ' ' +
              confirmLock.user.email +
              '? They will ' +
              (confirmLock.lock ? 'not' : '') +
              ' be able to sign in.'
            : ''
        }
        confirmLabel={confirmLock ? (confirmLock.lock ? 'Lock' : 'Unlock') : 'Confirm'}
        variant="danger"
        loading={lockLoading}
      />
    </div>
  );
}
