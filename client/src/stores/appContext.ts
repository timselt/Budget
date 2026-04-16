import { create } from 'zustand'

export const COMPANIES = [
  { id: 'tur-assist', name: 'Tur Assist A.Ş.' },
  { id: 'otokonfor', name: 'OtoKonfor' },
  { id: 'tur-medical', name: 'TUR Medical' },
  { id: 'konutkonfor', name: 'KonutKonfor' },
  { id: 'sigorta-acentesi', name: 'SigortaAcentesi.com' },
  { id: 'rs-otomotiv', name: 'RS Otomotiv' },
] as const

export const SCENARIOS = [
  { id: 'base', name: 'Senaryo: Base' },
  { id: 'optimistic', name: 'Senaryo: Optimistic' },
  { id: 'conservative', name: 'Senaryo: Conservative' },
] as const

export const YEARS = [2026, 2025, 2024] as const

interface AppContextState {
  selectedCompanyId: string | null
  selectedYear: number
  selectedScenario: string
  setCompany: (id: string | null) => void
  setYear: (year: number) => void
  setScenario: (scenario: string) => void
}

export const useAppContextStore = create<AppContextState>((set) => ({
  selectedCompanyId: null,
  selectedYear: 2026,
  selectedScenario: 'base',

  setCompany: (id) => set({ selectedCompanyId: id }),
  setYear: (year) => set({ selectedYear: year }),
  setScenario: (scenario) => set({ selectedScenario: scenario }),
}))
