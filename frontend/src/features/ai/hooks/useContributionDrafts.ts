import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { aiService } from '../services/ai.service'

// Under the `account` prefix so sign-out's reset drops them with the rest of the session.
const draftsKey = (toolId: string) => ['account', 'ai', 'drafts', toolId] as const
// The account feature's "my contributions" list; a sent draft lands there.
const MY_CONTRIBUTIONS_KEY = ['account', 'contributions'] as const

export function useContributionDrafts(toolId: string, enabled: boolean) {
  return useQuery({ queryKey: draftsKey(toolId), queryFn: () => aiService.drafts(toolId), enabled })
}

export function useSubmitDraft(toolId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; selectedIndexes: number[]; attribution: boolean }) => aiService.submitDraft(id, input),
    onSettled: () => {
      void client.invalidateQueries({ queryKey: draftsKey(toolId) })
      void client.invalidateQueries({ queryKey: MY_CONTRIBUTIONS_KEY })
    },
  })
}

export function useRemoveDraft(toolId: string) {
  const client = useQueryClient()
  return useMutation({ mutationFn: aiService.removeDraft, onSettled: () => void client.invalidateQueries({ queryKey: draftsKey(toolId) }) })
}
