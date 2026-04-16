import { useState, useCallback } from 'react'
import { useAdminCompanies, useCreateCompany } from '../../hooks/useAdminUsers'

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short' }).format(new Date(iso))
}

export function CompanyManagement() {
  const { data: companies, isLoading, error } = useAdminCompanies()
  const createCompany = useCreateCompany()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [taxId, setTaxId] = useState('')

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!name.trim() || !taxId.trim()) return

      createCompany.mutate(
        { name: name.trim(), taxId: taxId.trim() },
        {
          onSuccess: () => {
            setName('')
            setTaxId('')
            setShowForm(false)
          },
        },
      )
    },
    [name, taxId, createCompany],
  )

  if (isLoading) {
    return <div className="py-8 text-center text-text-muted">Yukleniryor...</div>
  }

  if (error) {
    return (
      <div className="py-8 text-center text-danger">
        Sirketler yuklenemedi.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Sirketler</h3>
        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          {showForm ? 'Kapat' : 'Yeni Sirket'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface-alt/30 p-4"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="company-name" className="text-xs font-medium text-text-muted">
              Sirket Adi
            </label>
            <input
              id="company-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sirket adi giriniz"
              className="rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="company-taxid" className="text-xs font-medium text-text-muted">
              Vergi No
            </label>
            <input
              id="company-taxid"
              type="text"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="Vergi numarasi"
              className="rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <button
            type="submit"
            disabled={createCompany.isPending || !name.trim() || !taxId.trim()}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {createCompany.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-left">
              <th className="px-4 py-3 font-medium text-text-muted">ID</th>
              <th className="px-4 py-3 font-medium text-text-muted">Kod</th>
              <th className="px-4 py-3 font-medium text-text-muted">Ad</th>
              <th className="px-4 py-3 font-medium text-text-muted">Para Birimi</th>
              <th className="px-4 py-3 font-medium text-text-muted">Kayit Tarihi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {companies?.map((company) => (
              <tr key={company.id} className="transition-colors hover:bg-surface-alt/50">
                <td className="px-4 py-3 tabular-nums">{company.id}</td>
                <td className="px-4 py-3 font-mono text-xs">{company.code}</td>
                <td className="px-4 py-3 font-medium">{company.name}</td>
                <td className="px-4 py-3">{company.baseCurrencyCode}</td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-text-muted">
                  {formatDate(company.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
