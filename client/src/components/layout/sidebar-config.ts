export interface SidebarItem {
  label: string
  to: string
  icon: string
  end?: boolean
  matchTabParam?: string // "Versiyonlar" için query param eşleşmesi
}

export interface SidebarSection {
  id: string
  label: string
  icon?: string
  defaultOpen: boolean
  /**
   * Alt item'lar. Boş array "section değil, tek başına tıklanabilir item" anlamına
   * gelir (Ana Sayfa gibi). Bu durumda `to` + `icon` item dan gelir.
   */
  items: SidebarItem[]
  /** items boşsa kendisi link. */
  to?: string
  end?: boolean
}

export const SIDEBAR_SECTIONS: readonly SidebarSection[] = [
  {
    id: 'home',
    label: 'Ana Sayfa',
    icon: 'dashboard',
    to: '/',
    end: true,
    defaultOpen: false,
    items: [],
  },
  {
    id: 'budget-work',
    label: 'Bütçe Çalışması',
    icon: 'edit_note',
    defaultOpen: true,
    items: [
      {
        label: 'Versiyonlar',
        to: '/budget/planning?tab=versions',
        icon: 'history_edu',
        matchTabParam: 'versions',
      },
      { label: 'Bütçe Planlama', to: '/budget/planning', icon: 'edit_note' },
      { label: 'Gider Girişi', to: '/expenses', icon: 'payments' },
      { label: 'Özel Kalemler', to: '/special-items', icon: 'bookmark_star' },
    ],
  },
  {
    id: 'actuals',
    label: 'Gerçekleşenler',
    icon: 'receipt_long',
    defaultOpen: false,
    items: [
      { label: 'Gerçekleşen', to: '/actuals', icon: 'receipt_long' },
      { label: 'Tahsilat', to: '/collections', icon: 'account_balance_wallet' },
    ],
  },
  {
    id: 'approvals',
    label: 'Onay ve Yayın',
    icon: 'verified',
    defaultOpen: true,
    items: [
      { label: 'Onaylar', to: '/approvals', icon: 'verified' },
      { label: 'Revizyonlar', to: '/revisions', icon: 'track_changes' },
    ],
  },
  {
    id: 'analysis',
    label: 'Analizler',
    icon: 'insights',
    defaultOpen: false,
    items: [
      { label: 'Sapma Analizi', to: '/variance', icon: 'compare_arrows' },
      { label: 'Senaryolar', to: '/scenarios', icon: 'insights' },
      { label: 'Tahmin', to: '/forecast', icon: 'trending_up' },
      { label: 'Konsolidasyon', to: '/consolidation', icon: 'hub' },
    ],
  },
  {
    id: 'reports',
    label: 'Raporlar',
    icon: 'assessment',
    defaultOpen: false,
    items: [
      { label: 'Rapor Merkezi', to: '/reports', icon: 'assessment', end: true },
      { label: 'P&L Raporu', to: '/reports/pnl', icon: 'monitoring' },
    ],
  },
  {
    id: 'definitions',
    label: 'Tanımlar',
    icon: 'category',
    defaultOpen: false,
    items: [
      { label: 'Müşteriler', to: '/customers', icon: 'groups' },
      { label: 'Ürünler', to: '/products', icon: 'inventory_2' },
      { label: 'Sözleşmeler', to: '/contracts', icon: 'assignment' },
      { label: 'Segmentler', to: '/segments', icon: 'category' },
      { label: 'Gider Kategorileri', to: '/expense-categories', icon: 'receipt' },
    ],
  },
  {
    id: 'reconciliation',
    label: 'Mutabakat',
    icon: 'fact_check',
    defaultOpen: false,
    items: [
      { label: 'Fiyat Arama', to: '/pricing/lookup', icon: 'search' },
    ],
  },
  {
    id: 'system',
    label: 'Sistem',
    icon: 'settings',
    defaultOpen: false,
    items: [
      { label: 'İşlem Geçmişi', to: '/audit', icon: 'history' },
      { label: 'Sistem Yönetimi', to: '/admin', icon: 'admin_panel_settings' },
    ],
  },
] as const

const STORAGE_KEY_PREFIX = 'sidebar-section-open:'

export function storageKeyFor(sectionId: string): string {
  return `${STORAGE_KEY_PREFIX}${sectionId}`
}

export function readSectionOpen(sectionId: string, defaultOpen: boolean): boolean {
  try {
    const raw = localStorage.getItem(storageKeyFor(sectionId))
    if (raw === null) return defaultOpen
    return raw === '1'
  } catch {
    return defaultOpen
  }
}

export function writeSectionOpen(sectionId: string, open: boolean): void {
  try {
    localStorage.setItem(storageKeyFor(sectionId), open ? '1' : '0')
  } catch {
    // localStorage kullanılamıyor → sessizce geç
  }
}
