import { useState, useCallback } from 'react'
import { UserManagement } from '../components/admin/UserManagement'
import { CompanyManagement } from '../components/admin/CompanyManagement'

type AdminTab = 'users' | 'companies'

const TABS: { key: AdminTab; label: string }[] = [
  { key: 'users', label: 'Kullanicilar' },
  { key: 'companies', label: 'Sirketler' },
]

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('users')

  const handleTabChange = useCallback((tab: AdminTab) => {
    setActiveTab(tab)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Yonetim Paneli</h1>
        <p className="mt-1 text-sm text-text-muted">
          Kullanici ve sirket yonetimi.
        </p>
      </div>

      <nav className="flex gap-1 rounded-lg border border-border bg-surface-alt/30 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleTabChange(tab.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-text shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'users' && <UserManagement />}
      {activeTab === 'companies' && <CompanyManagement />}
    </div>
  )
}
