/**
 * API hata mesajlarını kullanıcı diline çevirir. GlobalExceptionHandler (.NET)
 * 409 Conflict, 403 Forbidden, 400 BadRequest döner; bu helper kullanıcıya
 * "ne yapmalıyım?" cevabı veren mesaja dönüştürür.
 *
 * Tüm sayfalardaki mutation onError'larında çağırılır.
 */

interface ErrorContext {
  /** Hangi tür kayıt için (mesaj nüansı için kullanılabilir). */
  resource?: 'expense' | 'budget' | 'special-item' | 'actual' | 'scenario'
  /** Mevcut versiyon durumu (örn: 'Yürürlükte'). 409 mesajında kullanılır. */
  statusLabel?: string
  /** İstenen rol (örn: 'CFO'). 403 mesajında kullanılır. */
  requiredRole?: string
}

interface AxiosLikeError {
  response?: {
    status?: number
    data?: { error?: string; detail?: string; title?: string }
  }
  message?: string
}

const FALLBACK = 'İşlem başarısız.'

export function translateApiError(
  error: unknown,
  context: ErrorContext = {},
): string {
  if (!error) return FALLBACK

  const e = error as AxiosLikeError
  const status = e.response?.status
  const detail = e.response?.data?.detail ?? e.response?.data?.error ?? ''

  // 409 Conflict — versiyon düzenlenemez
  if (status === 409) {
    const label = context.statusLabel ?? 'salt-okunur'
    return (
      `Bu versiyon ${label} olduğu için değişiklik yapılamaz. ` +
      `Düzenlenebilir bir versiyon (Taslak veya Reddedildi) seçin ya da revizyon açın.`
    )
  }

  // 403 Forbidden — yetki
  if (status === 403) {
    if (context.requiredRole) {
      return `Bu işlem için ${context.requiredRole} rolü gerekiyor. Yöneticinizle iletişime geçin.`
    }
    return 'Bu işlem için yetkiniz yok.'
  }

  // 401 Unauthorized
  if (status === 401) {
    return 'Oturum süresi dolmuş olabilir. Lütfen yeniden giriş yapın.'
  }

  // 400 Bad Request — InvalidOperationException (state machine ihlali)
  if (status === 400 && detail) {
    // "Submit requires status Draft or Rejected, current is Active"
    const twoStateMatch = detail.match(
      /\w+ requires status (\w+) or (\w+), current is (\w+)/,
    )
    if (twoStateMatch) {
      const [, s1, s2, current] = twoStateMatch
      return `Bu versiyon ${current} durumunda. Aksiyon sadece ${s1} veya ${s2} durumlarında uygulanabilir.`
    }
    // "Archive requires status Active, current is Draft"
    const oneStateMatch = detail.match(
      /\w+ requires status (\w+), current is (\w+)/,
    )
    if (oneStateMatch) {
      const [, s1, current] = oneStateMatch
      return `Bu versiyon ${current} durumunda. Aksiyon sadece ${s1} durumunda uygulanabilir.`
    }
    return detail
  }

  // 5xx sunucu
  if (status && status >= 500) {
    return 'Sunucu hatası. Birkaç dakika sonra tekrar deneyin.'
  }

  // Native Error veya bilinmeyen
  if (e.message) {
    return e.message
  }

  return FALLBACK
}
