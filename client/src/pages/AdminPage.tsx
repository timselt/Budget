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
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-sl-on-surface">
          Yonetim Paneli
        </h1>
        <p className="mt-1 font-body text-sm text-sl-on-surface-variant">
          Kullanici ve sirket yonetimi.
        </p>
      </div>

      <nav className="flex gap-1 rounded-lg bg-sl-surface-low p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleTabChange(tab.key)}
            className={`rounded-md px-4 py-2 font-body text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-sl-surface-lowest text-sl-on-surface shadow-[var(--sl-shadow-sm)]'
                : 'text-sl-on-surface-variant hover:text-sl-on-surface'
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
