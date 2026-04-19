import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, GridApi } from 'ag-grid-community'
import api from '../lib/api'

/**
 * PriceBook editor (00b §4). Draft sürümdeki kalemleri AG-Grid ile inline
 * düzenler; bulk CSV import + approve aksiyonlarını içerir.
 */

interface PriceBookDetailDto {
  header: PriceBookHeader
  items: PriceBookItem[]
}

interface PriceBookHeader {
  id: number
  contractId: number
  contractCode: string
  versionNo: number
  effectiveFrom: string
  effectiveTo: string | null
  status: string
  notes: string | null
  itemCount: number
}

interface PriceBookItem {
  id: number
  priceBookId: number
  productCode: string
  productName: string
  itemType: string
  unit: string
  unitPrice: number
  currencyCode: string
  taxRate: number | null
  minQuantity: number | null
  notes: string | null
}

const ITEM_TYPES = [
  { code: 'InsurancePackage', label: 'Sigorta Paketi' },
  { code: 'AutomotiveService', label: 'Otomotiv Hizmeti' },
  { code: 'Other', label: 'Diğer' },
]

async function getDetail(id: number): Promise<PriceBookDetailDto> {
  const { data } = await api.get<PriceBookDetailDto>(`/price-books/${id}`)
  return data
}

export function PriceBookEditorPage() {
  const { id } = useParams<{ id: string }>()
  const pbid = Number(id)
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [rows, setRows] = useState<PriceBookItem[]>([])
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const detailQuery = useQuery({
    queryKey: ['price-book-detail', pbid],
    queryFn: () => getDetail(pbid),
    enabled: !Number.isNaN(pbid),
    refetchOnWindowFocus: false,
  })

  // TanStack Query verisi geldiğinde editable grid rows'u sync'lenir.
  // AG-Grid edit sırasında local state tutulur; refetch dirty=false sıfırlar.
  useEffect(() => {
    if (detailQuery.data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRows(detailQuery.data.items)
      setDirty(false)
    }
  }, [detailQuery.data])

  const header = detailQuery.data?.header
  const isDraft = header?.status === 'Draft'

  const columnDefs = useMemo<ColDef<PriceBookItem>[]>(
    () => [
      { field: 'productCode', headerName: 'Ürün Kodu', minWidth: 140, editable: isDraft },
      { field: 'productName', headerName: 'Ürün Adı', minWidth: 220, editable: isDraft },
      {
        field: 'itemType',
        headerName: 'Tip',
        minWidth: 160,
        editable: isDraft,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: ITEM_TYPES.map((t) => t.code) },
      },
      { field: 'unit', headerName: 'Birim', minWidth: 90, editable: isDraft },
      {
        field: 'unitPrice',
        headerName: 'Birim Fiyat',
        minWidth: 130,
        editable: isDraft,
        type: 'numericColumn',
        valueFormatter: (p) =>
          typeof p.value === 'number'
            ? p.value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
            : '',
        valueParser: (p) => Number(String(p.newValue).replace(/\./g, '').replace(',', '.')),
      },
      {
        field: 'currencyCode',
        headerName: 'Para',
        minWidth: 80,
        editable: isDraft,
      },
      {
        field: 'taxRate',
        headerName: 'KDV%',
        minWidth: 80,
        editable: isDraft,
        type: 'numericColumn',
      },
      {
        field: 'minQuantity',
        headerName: 'Min Adet',
        minWidth: 100,
        editable: isDraft,
        type: 'numericColumn',
      },
      { field: 'notes', headerName: 'Not', minWidth: 200, editable: isDraft },
    ],
    [isDraft],
  )

  const saveBulkMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        items: rows.map((r) => ({
          productCode: r.productCode,
          productName: r.productName,
          itemType: r.itemType,
          unit: r.unit,
          unitPrice: Number(r.unitPrice),
          currencyCode: r.currencyCode || 'TRY',
          taxRate: r.taxRate,
          minQuantity: r.minQuantity,
          notes: r.notes,
        })),
        replaceExisting: true,
      }
      await api.post(`/price-books/${pbid}/items/bulk`, payload)
    },
    onSuccess: () => {
      setDirty(false)
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['price-book-detail', pbid] })
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Kaydedilemedi'),
  })

  const approveMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/price-books/${pbid}/approve`)
    },
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['price-book-detail', pbid] })
      queryClient.invalidateQueries({ queryKey: ['price-books'] })
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Onay başarısız'),
  })

  const csvImportMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      await api.post(`/price-books/${pbid}/items/import?replaceExisting=true`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['price-book-detail', pbid] })
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'CSV import başarısız'),
  })

  const addRow = () => {
    const next: PriceBookItem = {
      id: 0,
      priceBookId: pbid,
      productCode: '',
      productName: '',
      itemType: 'Other',
      unit: 'PCS',
      unitPrice: 0,
      currencyCode: 'TRY',
      taxRate: null,
      minQuantity: null,
      notes: null,
    }
    setRows((prev) => [...prev, next])
    setDirty(true)
  }

  const deleteSelected = (api: GridApi<PriceBookItem>) => {
    const selected = api.getSelectedRows()
    if (selected.length === 0) return
    setRows((prev) =>
      prev.filter((r) => !selected.some((s) => s.productCode === r.productCode)),
    )
    setDirty(true)
  }

  if (detailQuery.isLoading) {
    return <p className="p-6 text-sm text-on-surface-variant">Yükleniyor…</p>
  }
  if (!header) {
    return <p className="p-6 text-sm text-error">PriceBook bulunamadı.</p>
  }

  return (
    <section>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link
            to={`/contracts/${header.contractId}/price-books`}
            className="text-xs text-on-surface-variant hover:text-primary"
          >
            ← Fiyat Listeleri
          </Link>
          <h2 className="text-3xl font-extrabold tracking-display text-on-surface mt-1">
            PriceBook V{header.versionNo}
          </h2>
          <p className="text-sm text-on-surface-variant font-mono mt-1">
            {header.contractCode} · {header.effectiveFrom}
            {header.effectiveTo ? ` → ${header.effectiveTo}` : ' → ∞'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`chip ${
              header.status === 'Active'
                ? 'chip-success'
                : header.status === 'Draft'
                  ? 'chip-info'
                  : 'chip-neutral'
            }`}
          >
            {header.status === 'Active' ? 'Aktif' : header.status === 'Draft' ? 'Taslak' : 'Arşiv'}
          </span>
          {isDraft ? (
            <>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={csvImportMutation.isPending}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  upload_file
                </span>
                CSV İçe Aktar
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) csvImportMutation.mutate(file)
                  e.target.value = ''
                }}
              />
              <button type="button" className="btn-secondary" onClick={addRow}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  add
                </span>
                Satır Ekle
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={!dirty || saveBulkMutation.isPending}
                onClick={() => saveBulkMutation.mutate()}
              >
                {saveBulkMutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={dirty || rows.length === 0 || approveMutation.isPending}
                onClick={() => approveMutation.mutate()}
                title={dirty ? 'Önce kaydedin' : 'Draft\'ı Aktif\'e yükselt'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  verified
                </span>
                Onayla
              </button>
            </>
          ) : null}
        </div>
      </div>

      {error ? <div className="card bg-error-container text-error mb-4 text-sm">{error}</div> : null}

      <div
        className="ag-theme-quartz"
        style={{ height: 'calc(100vh - 320px)', minHeight: 400 }}
      >
        <AgGridReact<PriceBookItem>
          rowData={rows}
          columnDefs={columnDefs}
          onCellValueChanged={(e) => {
            setRows((prev) => prev.map((r, i) => (i === e.rowIndex ? (e.data as PriceBookItem) : r)))
            setDirty(true)
          }}
          rowSelection={isDraft ? 'multiple' : undefined}
          animateRows
          defaultColDef={{ resizable: true, sortable: true }}
          onGridReady={(e) => {
            // Seçili satır silme kısayolu (Delete tuşu)
            window.addEventListener('keydown', (ev) => {
              if (ev.key === 'Delete' && isDraft) deleteSelected(e.api)
            })
          }}
        />
      </div>
    </section>
  )
}
