import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import type { ImportResult } from '../types/collections'

interface ImportParams {
  segmentId: number
  file: File
}

export function useCollectionImport() {
  const queryClient = useQueryClient()

  return useMutation<ImportResult, Error, ImportParams>({
    mutationFn: async ({ segmentId, file }: ImportParams) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('segmentId', String(segmentId))

      const { data } = await api.post('/collections/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] })
    },
  })
}
