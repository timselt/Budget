import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

interface CustomerRow {
  id: number
  code: string
  name: string
  categoryCode: string | null
  subCategory: string | null
  taxId: string | null
  taxOffice: string | null
  segmentId: number
  segmentName: string | null
  startDate: string | null
  endDate: string | null
  isGroupInternal: boolean
  accountManager: string | null
  defaultCurrencyCode: string | null
  isActive: boolean
}

async function getCustomers(): Promise<CustomerRow[]> {
  const { data } = await api.get<CustomerRow[]>('/customers')
  return data
}

export function MasterDataPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
  })

  return (
    <section>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-display text-[#002366]">
            Master Data Yönetimi
          </h2>
          <p className="text-sm text-on-surface-variant mt-2 max-w-2xl">
            İlk dikey dilim olarak müşteri master ekranı gerçek API verisine bağlandı. Import
            şablonundaki müşteri alanlarının kritik kısmı artık sistemde taşınabiliyor.
          </p>
        </div>
        <button type="button" className="btn-primary" disabled>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            add
          </span>
          Yeni Müşteri
        </button>
      </div>

      <div className="card mb-6 flex flex-wrap items-center gap-3">
        <span className="chip chip-info">Aktif dilim: MUSTERI</span>
        <span className="text-sm text-on-surface-variant">
          Alanlar: müşteri kodu, kategori, alt kategori, VKN, vergi dairesi, grup içi, sözleşme
          tarihleri, hesap yöneticisi, varsayılan para birimi.
        </span>
        <button
          type="button"
          className="btn-secondary ml-auto"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            sync
          </span>
          Yenile
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-sm text-on-surface-variant">Müşteri verileri yükleniyor...</div>
        ) : null}

        {isError ? (
          <div className="p-6 text-sm text-error">
            Müşteri verileri alınamadı. API bağlantısını ve giriş durumunu kontrol et.
          </div>
        ) : null}

        {!isLoading && !isError ? (
          <table className="tbl">
            <thead>
              <tr>
                <th>Kod</th>
                <th>Müşteri</th>
                <th>Kategori</th>
                <th>VKN</th>
                <th>Grup İçi</th>
                <th>Hesap Yöneticisi</th>
                <th>Para Birimi</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((customer) => (
                <tr key={customer.id}>
                  <td className="font-mono text-xs">{customer.code}</td>
                  <td>
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-xs text-on-surface-variant">
                      {customer.subCategory ?? customer.segmentName ?? `Segment #${customer.segmentId}`}
                    </div>
                  </td>
                  <td>{customer.categoryCode ?? '-'}</td>
                  <td>
                    <div className="font-mono text-xs">{customer.taxId ?? '-'}</div>
                    <div className="text-xs text-on-surface-variant">{customer.taxOffice ?? '-'}</div>
                  </td>
                  <td>
                    <span
                      className={`chip chip-${customer.isGroupInternal ? 'warning' : 'neutral'}`}
                    >
                      {customer.isGroupInternal ? 'Evet' : 'Hayır'}
                    </span>
                  </td>
                  <td>{customer.accountManager ?? '-'}</td>
                  <td>{customer.defaultCurrencyCode ?? 'TRY'}</td>
                  <td>
                    <span className={`chip chip-${customer.isActive ? 'success' : 'neutral'}`}>
                      {customer.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                </tr>
              ))}
              {data?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-sm text-on-surface-variant">
                    Henüz müşteri kaydı bulunmuyor.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        ) : null}
      </div>
    </section>
  )
}
