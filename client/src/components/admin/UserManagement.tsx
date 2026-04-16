import { useState, useCallback } from 'react'
import { useAdminUsers, useUpdateUserRole, type AdminUser } from '../../hooks/useAdminUsers'

const ROLE_OPTIONS = ['Admin', 'CFO', 'FinanceManager', 'DepartmentHead', 'Viewer'] as const

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short' }).format(new Date(iso))
}

export function UserManagement() {
  const { data: users, isLoading, error } = useAdminUsers()
  const updateRole = useUpdateUserRole()
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [selectedRole, setSelectedRole] = useState('')

  const handleEditRole = useCallback((user: AdminUser) => {
    setEditingUserId(user.id)
    setSelectedRole(user.roles[0] ?? 'Viewer')
  }, [])

  const handleSaveRole = useCallback(
    (userId: number) => {
      updateRole.mutate(
        { userId, role: selectedRole },
        { onSuccess: () => setEditingUserId(null) },
      )
    },
    [selectedRole, updateRole],
  )

  const handleCancel = useCallback(() => {
    setEditingUserId(null)
    setSelectedRole('')
  }, [])

  if (isLoading) {
    return <div className="py-8 text-center text-text-muted">Yukleniryor...</div>
  }

  if (error) {
    return (
      <div className="py-8 text-center text-danger">
        Kullanicilar yuklenemedi.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-alt text-left">
            <th className="px-4 py-3 font-medium text-text-muted">Ad</th>
            <th className="px-4 py-3 font-medium text-text-muted">E-posta</th>
            <th className="px-4 py-3 font-medium text-text-muted">Rol</th>
            <th className="px-4 py-3 font-medium text-text-muted">Durum</th>
            <th className="px-4 py-3 font-medium text-text-muted">Kayit Tarihi</th>
            <th className="px-4 py-3 font-medium text-text-muted">Islem</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users?.map((user) => (
            <tr key={user.id} className="transition-colors hover:bg-surface-alt/50">
              <td className="px-4 py-3 font-medium">{user.displayName}</td>
              <td className="px-4 py-3 text-text-muted">{user.email}</td>
              <td className="px-4 py-3">
                {editingUserId === user.id ? (
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="rounded-md border border-border bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="inline-flex rounded-md bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                    {user.roles.join(', ') || 'Yok'}
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    user.isActive
                      ? 'bg-success/10 text-success'
                      : 'bg-danger/10 text-danger'
                  }`}
                >
                  {user.isActive ? 'Aktif' : 'Pasif'}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 tabular-nums text-text-muted">
                {formatDate(user.createdAt)}
              </td>
              <td className="px-4 py-3">
                {editingUserId === user.id ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveRole(user.id)}
                      disabled={updateRole.isPending}
                      className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
                    >
                      Kaydet
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="rounded-md border border-border px-3 py-1 text-xs font-medium text-text-muted transition-colors hover:bg-surface-alt"
                    >
                      Iptal
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleEditRole(user)}
                    className="rounded-md border border-border px-3 py-1 text-xs font-medium text-text-muted transition-colors hover:bg-surface-alt"
                  >
                    Rol Degistir
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
