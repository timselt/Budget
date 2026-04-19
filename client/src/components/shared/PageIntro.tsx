import type { ReactNode } from 'react'

interface PageIntroProps {
  title: string
  /** Tek cümle ekran amacı (italik altı). Audit Sprint 2/3: her ekran "bu
   *  ekran ne işe yarar?" bilgisini vermeli. */
  purpose?: string
  /** Sağda action butonları (Yeni X, Excel İndir vb.). */
  actions?: ReactNode
  /** Başlık altında purpose'tan önce ek bağlam (badge, chip vb.). */
  context?: ReactNode
}

/**
 * Sprint 2/3 standart ekran başlığı — title + 1 cümle amaç + opsiyonel
 * sağ-aksiyonlar. Mevcut ad-hoc `<div className="flex justify-between..."`
 * patternının yerini alır; bağlam metni `.page-context-hint` class'ı ile
 * tutarlı kalır (CSS değişmez).
 */
export function PageIntro({ title, purpose, actions, context }: PageIntroProps) {
  return (
    <div className="flex justify-between items-end mb-6 gap-4 flex-wrap">
      <div className="min-w-0 flex-1">
        <h2 className="text-3xl font-extrabold tracking-display text-on-surface">
          {title}
        </h2>
        {context && <div className="mt-1">{context}</div>}
        {purpose && <p className="page-context-hint">{purpose}</p>}
      </div>
      {actions && <div className="flex gap-3 flex-wrap">{actions}</div>}
    </div>
  )
}
