import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'

/**
 * 403 landing page. Reached by `lib/api.ts` when the API replies with
 * `403 Forbidden` — the user is authenticated but lacks the role policy
 * required for the route they tried to hit (ADR-0009 §2.2).
 *
 * The page is deliberately minimal: one icon, one Turkish message, one
 * link back to the dashboard. No automatic retry and no "contact
 * admin" form, so a mis-permissioned user cannot mistakenly flood a
 * support channel.
 */
export function ForbiddenPage() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <ShieldAlert className="h-12 w-12 text-amber-500" aria-hidden />
      <h1 className="text-2xl font-semibold">403 — {t('errors.forbidden')}</h1>
      <p className="max-w-md text-sm text-on-surface-variant">
        {t('errors.forbidden')}
      </p>
      <Link
        to="/"
        className="text-sm font-medium text-primary underline underline-offset-2"
      >
        {t('nav.dashboard')}
      </Link>
    </div>
  )
}
