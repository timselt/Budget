import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { resetOnboardingTour } from '../components/shared/OnboardingTour'

type Tab = 'users' | 'companies'

interface AdminUser {
  id: number
  email: string
  displayName: string
  roles: string[]
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
}

interface AdminCompany {
  id: number
  code: string
  name: string
  baseCurrencyCode: string
  createdAt: string
}

const ROLES = ['Admin', 'CFO', 'FinanceManager', 'ReconAgent', 'DepartmentHead', 'Viewer'] as const
type Role = (typeof ROLES)[number]

const ROLE_LABEL: Record<Role, string> = {
  Admin: 'Admin',
  CFO: 'CFO',
  FinanceManager: 'Finans Yöneticisi',
  ReconAgent: 'Mutabakat Uzmanı',
  DepartmentHead: 'Departman Müdürü',
  Viewer: 'İzleyici',
}

const ROLE_DESCRIPTION: Record<Role, string> = {
  Admin: 'Tüm yetkiler — kullanıcı, şirket ve sistem yönetimi',
  CFO: 'Bütçe versiyon onayı, kilitleme ve risk kuralları',
  FinanceManager: 'Bütçe hazırlık, versiyon submit, muhasebe export',
  ReconAgent: 'Mutabakat ekibi — sigorta ve otomotiv mutabakat süreçlerini yürütür',
  DepartmentHead: 'Kendi departmanı için bütçe giriş yetkisi',
  Viewer: 'Salt okunur — rapor görüntüleme',
}

const ROLE_CHIP: Record<Role, string> = {
  Admin: 'chip-error',
  CFO: 'chip-info',
  FinanceManager: 'chip-info',
  ReconAgent: 'chip-info',
  DepartmentHead: 'chip-warning',
  Viewer: 'chip-neutral',
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'users', label: 'Kullanıcılar', icon: 'group' },
  { id: 'companies', label: 'Şirketler', icon: 'apartment' },
]

async function getUsers(): Promise<AdminUser[]> {
  const { data } = await api.get<AdminUser[]>('/admin/users')
  return data
}

async function getCompanies(): Promise<AdminCompany[]> {
  const { data } = await api.get<AdminCompany[]>('/admin/companies')
  return data
}

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('users')

  return (
    <section>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-display text-on-surface">Yönetim</h2>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            resetOnboardingTour()
            window.location.reload()
          }}
          title="İlk kullanım rehber balonlarını yeniden başlat"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            replay
          </span>
          Tanıtımı Tekrar Göster
        </button>
      </div>

      <div className="flex gap-1 mb-4 bg-surface-container-low rounded-lg p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="material-symbols-outlined align-middle mr-1" style={{ fontSize: 16 }}>
              {t.icon}
            </span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'users' ? <UsersTab /> : <CompaniesTab />}
    </section>
  )
}

function UsersTab() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const usersQuery = useQuery({ queryKey: ['admin-users'], queryFn: getUsers })
  const users = usersQuery.data ?? []

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: Role }) => {
      await api.put(`/admin/users/${userId}/role`, { role })
    },
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Rol güncellenemedi'),
  })

  return (
    <>
      <div className="grid grid-cols-12 gap-4 mb-6">
        <KpiCard title="Toplam Kullanıcı" value={`${users.length}`} subtitle={`${users.filter((u) => u.isActive).length} aktif`} />
        {ROLES.map((r) => (
          <KpiCard
            key={r}
            title={ROLE_LABEL[r]}
            value={`${users.filter((u) => u.roles.includes(r)).length}`}
            subtitle={ROLE_LABEL[r]}
          />
        ))}
      </div>

      {error ? (
        <div className="card mb-4 text-sm text-error">
          <span className="material-symbols-outlined align-middle mr-1" style={{ fontSize: 16 }}>
            error
          </span>
          {error}
        </div>
      ) : null}

      <div className="card p-0 overflow-hidden">
        {usersQuery.isLoading ? (
          <p className="p-6 text-sm text-on-surface-variant">Yükleniyor...</p>
        ) : usersQuery.isError ? (
          <p className="p-6 text-sm text-error">
            Kullanıcı listesi alınamadı. Admin rolü yetkiniz olduğundan emin olun.
          </p>
        ) : users.length === 0 ? (
          <p className="p-6 text-sm text-on-surface-variant">Kullanıcı yok.</p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Ad</th>
                <th>E-posta</th>
                <th>Durum</th>
                <th>Rol</th>
                <th>Son Giriş</th>
                <th>Oluşturuldu</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const primaryRole = (u.roles[0] ?? 'Viewer') as Role
                return (
                  <tr key={u.id}>
                    <td className="font-semibold">{u.displayName}</td>
                    <td className="font-mono text-xs">{u.email}</td>
                    <td>
                      <span className={`chip ${u.isActive ? 'chip-success' : 'chip-neutral'}`}>
                        {u.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className={`chip ${ROLE_CHIP[primaryRole] ?? 'chip-neutral'}`}>
                          {ROLE_LABEL[primaryRole] ?? primaryRole}
                        </span>
                        <select
                          className="select text-xs"
                          style={{ minWidth: 140 }}
                          value={primaryRole}
                          title={ROLE_DESCRIPTION[primaryRole] ?? ''}
                          disabled={updateRoleMutation.isPending}
                          onChange={(e) => {
                            const role = e.target.value as Role
                            if (role === primaryRole) return
                            if (confirm(`${u.displayName} kullanıcısının rolü ${ROLE_LABEL[role]} olarak değiştirilecek. Emin misiniz?\n\n${ROLE_DESCRIPTION[role]}`)) {
                              updateRoleMutation.mutate({ userId: u.id, role })
                            }
                          }}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r} title={ROLE_DESCRIPTION[r]}>
                              {ROLE_LABEL[r]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="text-xs text-on-surface-variant">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('tr-TR') : '—'}
                    </td>
                    <td className="text-xs text-on-surface-variant">
                      {new Date(u.createdAt).toLocaleDateString('tr-TR')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

function CompaniesTab() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)

  const companiesQuery = useQuery({ queryKey: ['admin-companies'], queryFn: getCompanies })
  const companies = companiesQuery.data ?? []

  return (
    <>
      <div className="flex justify-end mb-4">
        <button type="button" className="btn-primary" onClick={() => setShowModal(true)}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            add
          </span>
          Yeni Şirket
        </button>
      </div>

      <div className="grid grid-cols-12 gap-4 mb-6">
        <KpiCard title="Toplam Şirket" value={`${companies.length}`} subtitle="tenant sayısı" />
      </div>

      <div className="card p-0 overflow-hidden">
        {companiesQuery.isLoading ? (
          <p className="p-6 text-sm text-on-surface-variant">Yükleniyor...</p>
        ) : companiesQuery.isError ? (
          <p className="p-6 text-sm text-error">Şirket listesi alınamadı.</p>
        ) : companies.length === 0 ? (
          <p className="p-6 text-sm text-on-surface-variant">Henüz şirket yok.</p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Kod / VKN</th>
                <th>Ad</th>
                <th>Baz Para Birimi</th>
                <th>Oluşturuldu</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id}>
                  <td className="font-mono text-xs">{c.code}</td>
                  <td className="font-semibold">{c.name}</td>
                  <td className="font-mono text-xs">{c.baseCurrencyCode}</td>
                  <td className="text-xs text-on-surface-variant">
                    {new Date(c.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal ? (
        <CreateCompanyModal
          onClose={() => setShowModal(false)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-companies'] })
            setShowModal(false)
          }}
        />
      ) : null}
    </>
  )
}

function CreateCompanyModal({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [taxId, setTaxId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post('/admin/companies', { name: name.trim(), taxId: taxId.trim() })
    },
    onSuccess: () => onSaved(),
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Şirket oluşturulamadı'),
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md"
        style={{ padding: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="text-lg font-bold text-on-surface">Yeni Şirket</h3>
          <button
            type="button"
            className="p-1 text-on-surface-variant hover:text-primary"
            onClick={onClose}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form
          className="grid gap-4 px-6 pb-6"
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            mutation.mutate()
          }}
        >
          <label className="block">
            <span className="label-sm block mb-1.5">Şirket Adı</span>
            <input
              className="input w-full"
              value={name}
              required
              maxLength={200}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="label-sm block mb-1.5">Vergi Kimlik No (VKN)</span>
            <input
              className="input w-full"
              value={taxId}
              required
              maxLength={32}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="1234567890"
            />
          </label>
          {error ? <p className="text-sm text-error">{error}</p> : null}
          <div className="flex gap-2 justify-end">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Vazgeç
            </button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Oluşturuluyor…' : 'Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function KpiCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="col-span-6 md:col-span-2 card">
      <span className="label-sm">{title}</span>
      <p className="text-2xl font-black tracking-display num mt-2">{value}</p>
      <p className="text-xs text-on-surface-variant mt-1">{subtitle}</p>
    </div>
  )
}
