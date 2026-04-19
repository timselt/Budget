import type { VersionCardVersion } from './VersionCard'

/**
 * Kart grid sıralaması: Aktif önce, sonra Archived dışındakiler createdAt
 * DESC, en altta Archived. Stable sort — aynı bucket'ta orijinal sıra korunur.
 *
 * `VersionCard.tsx`'ten ayrı dosyaya alındı çünkü Vite/React Fast Refresh
 * sadece component-only export edilen dosyalarda doğru çalışıyor
 * (`react-refresh/only-export-components`). Component dosyası yanında
 * non-component value export tutmak HMR'ı bozar.
 */
export function sortVersionsForDisplay<T extends VersionCardVersion>(
  versions: ReadonlyArray<T>,
): T[] {
  const bucket = (v: T): number => {
    if (v.isActive || v.status === 'Active') return 0
    if (v.status === 'Archived') return 2
    return 1
  }
  return [...versions].sort((a, b) => {
    const ba = bucket(a)
    const bb = bucket(b)
    if (ba !== bb) return ba - bb
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}
