import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

interface ProductCategoryRow {
  id: number
  code: string
  name: string
  description: string | null
  displayOrder: number
  segmentId: number | null
  segmentName: string | null
  isActive: boolean
}

interface ProductRow {
  id: number
  productCategoryId: number
  productCategoryName: string | null
  code: string
  name: string
  description: string | null
  coverageTermsJson: string | null
  defaultCurrencyCode: string | null
  displayOrder: number
  isActive: boolean
}

async function getCategories(): Promise<ProductCategoryRow[]> {
  const { data } = await api.get<ProductCategoryRow[]>('/product-categories')
  return data
}

async function getProducts(categoryId: number | null): Promise<ProductRow[]> {
  const params = categoryId ? `?categoryId=${categoryId}` : ''
  const { data } = await api.get<ProductRow[]>(`/products${params}`)
  return data
}

export function ProductsPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)

  const categoriesQuery = useQuery({
    queryKey: ['product-categories'],
    queryFn: getCategories,
  })

  const productsQuery = useQuery({
    queryKey: ['products', selectedCategoryId],
    queryFn: () => getProducts(selectedCategoryId),
  })

  const categories = categoriesQuery.data ?? []
  const products = productsQuery.data ?? []
  const activeCategoriesCount = categories.filter((c) => c.isActive).length
  const activeProductsCount = products.filter((p) => p.isActive).length
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null

  return (
    <section>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-display text-on-surface">
            Urun Yonetimi
          </h2>
          <p className="text-sm text-on-surface-variant mt-2 max-w-2xl">
            Urun kategorileri ve teminat-bazli urun katalogu. Musteri-urun eslesmesi ve
            butce giriminde referans alinan katalog buradan yonetilir (ADR-0013).
          </p>
        </div>
        <div className="flex gap-3">
          <button type="button" className="btn-secondary" disabled>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              category
            </span>
            Yeni Kategori
          </button>
          <button type="button" className="btn-primary" disabled={!selectedCategoryId}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              add
            </span>
            Yeni Urun
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 mb-6">
        <KpiCard title="Kategori" value={`${activeCategoriesCount} / ${categories.length}`} subtitle="Aktif / Toplam" />
        <KpiCard
          title="Urun"
          value={`${activeProductsCount} / ${products.length}`}
          subtitle={selectedCategory ? `Kategori: ${selectedCategory.name}` : 'Tum kategoriler'}
        />
        <KpiCard title="Teminat Parametreleri" value="JSONB" subtitle="Esnek alan (gun, sefer, limit TL)" />
        <KpiCard title="Musteri Bagi" value="CustomerProduct" subtitle="Komisyon + kontrat tarihleri" />
      </div>

      <div className="grid grid-cols-12 gap-6">
        <aside className="col-span-12 lg:col-span-4 card p-0 overflow-hidden">
          <div className="p-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-on-surface">Kategoriler</h3>
            <button
              type="button"
              className="chip chip-neutral"
              onClick={() => setSelectedCategoryId(null)}
            >
              Tumu
            </button>
          </div>
          {categoriesQuery.isLoading ? (
            <p className="px-4 pb-4 text-sm text-on-surface-variant">Yukleniyor...</p>
          ) : categoriesQuery.isError ? (
            <p className="px-4 pb-4 text-sm text-error">Kategoriler alinamadi.</p>
          ) : categories.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-on-surface-variant">
              Henuz urun kategorisi eklenmemis. Muhasebe ekibinden kategori listesi onayi bekleniyor
              (ADR-0013 §5).
            </p>
          ) : (
            <ul className="divide-y divide-surface-container-low">
              {categories.map((category) => {
                const isSelected = category.id === selectedCategoryId
                return (
                  <li key={category.id}>
                    <button
                      type="button"
                      className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-surface-container-low'
                          : 'hover:bg-surface-container-low/40'
                      }`}
                      onClick={() => setSelectedCategoryId(category.id)}
                    >
                      <div>
                        <p className="text-sm font-bold text-on-surface">{category.name}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {category.segmentName ?? 'Tum segmentler'} - {category.code}
                        </p>
                      </div>
                      <span
                        className={`chip ${category.isActive ? 'chip-success' : 'chip-neutral'}`}
                      >
                        {category.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        <div className="col-span-12 lg:col-span-8 card p-0 overflow-hidden">
          <div className="p-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-on-surface">
                {selectedCategory ? `${selectedCategory.name} - Urunler` : 'Tum Urunler'}
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {selectedCategory
                  ? `Kategori altindaki teminat-bazli varyasyonlar (${selectedCategory.code}).`
                  : 'Filtre icin sol listeden kategori secin.'}
              </p>
            </div>
          </div>
          {productsQuery.isLoading ? (
            <p className="px-4 pb-4 text-sm text-on-surface-variant">Yukleniyor...</p>
          ) : productsQuery.isError ? (
            <p className="px-4 pb-4 text-sm text-error">Urunler alinamadi.</p>
          ) : products.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-on-surface-variant">
              {selectedCategory
                ? 'Bu kategoride henuz urun yok.'
                : 'Henuz urun tanimlanmamis. Muhasebe onayi sonrasi seed yuklenecek.'}
            </p>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Kod</th>
                  <th>Ad</th>
                  <th>Kategori</th>
                  <th>Para Birimi</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="font-mono text-xs">{product.code}</td>
                    <td className="font-semibold">{product.name}</td>
                    <td className="text-on-surface-variant text-sm">
                      {product.productCategoryName ?? '-'}
                    </td>
                    <td className="text-on-surface-variant text-sm">
                      {product.defaultCurrencyCode ?? 'TRY'}
                    </td>
                    <td>
                      <span className={`chip ${product.isActive ? 'chip-success' : 'chip-neutral'}`}>
                        {product.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  )
}

function KpiCard({
  title,
  value,
  subtitle,
}: {
  title: string
  value: string
  subtitle: string
}) {
  return (
    <div className="col-span-12 md:col-span-3 card">
      <span className="label-sm">{title}</span>
      <p className="text-2xl font-black tracking-display num mt-2">{value}</p>
      <p className="text-xs text-on-surface-variant mt-1">{subtitle}</p>
    </div>
  )
}
