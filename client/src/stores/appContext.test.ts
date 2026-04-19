import { describe, expect, it, beforeEach } from 'vitest'
import { useAppContextStore } from './appContext'

describe('useAppContextStore — version fields', () => {
  beforeEach(() => {
    useAppContextStore.getState().setVersion(null)
  })

  it('initial state version fields are null', () => {
    const { selectedVersionId, selectedVersionLabel, selectedVersionStatus } =
      useAppContextStore.getState()
    expect(selectedVersionId).toBeNull()
    expect(selectedVersionLabel).toBeNull()
    expect(selectedVersionStatus).toBeNull()
  })

  it('setVersion updates all three fields atomically', () => {
    useAppContextStore.getState().setVersion({
      id: 42,
      label: 'V5 Taslak',
      status: 'Draft',
    })
    const state = useAppContextStore.getState()
    expect(state.selectedVersionId).toBe(42)
    expect(state.selectedVersionLabel).toBe('V5 Taslak')
    expect(state.selectedVersionStatus).toBe('Draft')
  })

  it('setVersion(null) clears all three fields', () => {
    useAppContextStore.getState().setVersion({ id: 1, label: 'x', status: 'y' })
    useAppContextStore.getState().setVersion(null)
    const state = useAppContextStore.getState()
    expect(state.selectedVersionId).toBeNull()
    expect(state.selectedVersionLabel).toBeNull()
    expect(state.selectedVersionStatus).toBeNull()
  })
})
