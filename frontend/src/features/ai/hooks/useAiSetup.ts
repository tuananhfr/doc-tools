import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { aiService, type SavedProvider } from '../services/ai.service'
import type { AiSetup } from '../types/ai.types'

// Under the `account` prefix so sign-out's reset drops it with the rest of the session.
export const AI_SETUP_KEY = ['account', 'ai', 'setup'] as const

export function useAiSetup(enabled: boolean) {
  return useQuery({ queryKey: AI_SETUP_KEY, queryFn: aiService.setup, enabled, staleTime: 30_000 })
}

export function useProviderTypes(enabled: boolean) {
  return useQuery({ queryKey: ['ai', 'provider-types'], queryFn: aiService.providerTypes, enabled, staleTime: Infinity })
}

function useStoreSetup() {
  const client = useQueryClient()
  return (setup: AiSetup | SavedProvider) => client.setQueryData<AiSetup>(AI_SETUP_KEY, { available: setup.available, provider: setup.provider, agent: setup.agent })
}

export function useSaveProvider() {
  const store = useStoreSetup()
  return useMutation({ mutationFn: aiService.saveProvider, onSuccess: store })
}

export function useVerifyModel() {
  const store = useStoreSetup()
  const client = useQueryClient()
  return useMutation({
    mutationFn: aiService.verify,
    onSuccess: store,
    // A failed check also changed the stored status (and its message) on the server.
    onError: () => void client.invalidateQueries({ queryKey: AI_SETUP_KEY }),
  })
}

export function useRemoveProvider() {
  const store = useStoreSetup()
  return useMutation({ mutationFn: aiService.removeProvider, onSuccess: store })
}
