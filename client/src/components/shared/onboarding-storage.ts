export const ONBOARDING_STORAGE_KEY = 'finopstur-onboarding-completed-v1'

/** Admin ekranından "Tanıtımı tekrar göster" için reset. */
export function resetOnboardingTour() {
  localStorage.removeItem(ONBOARDING_STORAGE_KEY)
}
