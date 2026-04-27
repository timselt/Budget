import { useState } from 'react'
import { Modal } from '../../shared/ui/Modal'

const TEMPLATE_REASONS = [
  'Eksik veri — bazı müşterilerde tutar girilmemiş',
  'Varsayım hatası — kabul edilen büyüme oranları gerçekçi değil',
  'Gider revizyonu gerekli — OPEX kategorileri yeniden gözden geçirilmeli',
  'KPI hedefi uyuşmuyor — Loss Ratio veya Marj hedefin altında',
  'Senaryo eksik — alternatif senaryo girilmemiş',
] as const

interface Props {
  versionName: string
  pending?: boolean
  onConfirm: (reason: string) => void
  onClose: () => void
}

export function RejectModal({ versionName, pending, onConfirm, onClose }: Props) {
  const [selected, setSelected] = useState<string>('')
  const [customNote, setCustomNote] = useState<string>('')

  const finalReason = customNote.trim()
    ? `${selected}${selected ? ' — ' : ''}${customNote.trim()}`
    : selected

  const canSubmit = finalReason.length > 0 && !pending

  return (
    <Modal
      open
      onClose={onClose}
      title="Versiyonu Reddet"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Vazgeç
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!canSubmit}
            onClick={() => onConfirm(finalReason)}
          >
            {pending ? 'Reddediliyor…' : 'Reddet'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-on-surface-variant">
          <strong className="text-on-surface">{versionName}</strong> versiyonu
          reddedilecek. Sebep girmeden devam edilemez.
        </p>

        <div>
          <span className="label-sm block mb-2">Hazır şablonlardan seçin</span>
          <div className="space-y-1.5">
            {TEMPLATE_REASONS.map((reason) => (
              <label
                key={reason}
                className="flex items-start gap-2 text-sm cursor-pointer hover:bg-surface-container-low p-2 rounded"
              >
                <input
                  type="radio"
                  name="rejection-reason"
                  value={reason}
                  checked={selected === reason}
                  onChange={() => setSelected(reason)}
                  className="mt-0.5"
                />
                <span className="text-on-surface">{reason}</span>
              </label>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="label-sm block mb-1.5">
            Ek not (opsiyonel) — şablona ek açıklama ekle
          </span>
          <textarea
            className="input w-full"
            rows={2}
            value={customNote}
            maxLength={500}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="Örn: Bahar aylarında gelir tahminleri düşürülmeli."
          />
        </label>

        {!selected && customNote.trim() === '' ? (
          <p className="text-xs text-on-surface-variant">
            Lütfen bir şablon seçin veya özel sebep yazın.
          </p>
        ) : (
          <div className="text-xs text-on-surface-variant border-l-4 border-primary pl-3 py-1 bg-surface-container-low rounded">
            <strong>Gönderilecek sebep:</strong> {finalReason}
          </div>
        )}
      </div>
    </Modal>
  )
}
