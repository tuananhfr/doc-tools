import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cloudService } from '../services/cloud.service'
import type { SavedList, SavedMeta } from '../types/cloud.types'

// Under the `account` prefix so sign-out's reset drops them with the rest of the session.
export const SAVED_KEY = ['account', 'saved'] as const
const HISTORY_KEY = ['account', 'source-check-history'] as const

/**
 * The basic sync between devices: the server list is the only copy, re-read when the tab comes back
 * into view and every minute while it stays visible (TanStack pauses the interval in background tabs).
 */
export function useSavedItems(enabled: boolean) {
  return useQuery({ queryKey: SAVED_KEY, queryFn: cloudService.list, enabled, staleTime: 15_000, refetchOnWindowFocus: true, refetchInterval: 60_000 })
}

export function useRefreshSaved() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: SAVED_KEY })
}

function useReplaceInList() {
  const client = useQueryClient()
  return (item: SavedMeta) => client.setQueryData<SavedList>(SAVED_KEY, (list) => list && { ...list, items: [item, ...list.items.filter((entry) => entry.id !== item.id)] })
}

export function useSaveResult() {
  const refresh = useRefreshSaved()
  return useMutation({ mutationFn: cloudService.saveResult, onSettled: refresh })
}

export function useUpdateSaved() {
  const replace = useReplaceInList()
  const refresh = useRefreshSaved()
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; title?: string; payload?: Record<string, unknown>; baseRev: number; force?: boolean }) => cloudService.update(id, input),
    onSuccess: replace,
    onSettled: refresh,
  })
}

export function useRemoveSaved() {
  const client = useQueryClient()
  const refresh = useRefreshSaved()
  return useMutation({
    mutationFn: cloudService.remove,
    onSuccess: (_result, id) => client.setQueryData<SavedList>(SAVED_KEY, (list) => list && { ...list, items: list.items.filter((entry) => entry.id !== id) }),
    onSettled: refresh,
  })
}

/** Optimistic: the star flips at once and flips back if the server says no. */
export function useToggleBookmark() {
  const client = useQueryClient()
  const refresh = useRefreshSaved()
  return useMutation({
    mutationFn: async ({ toolId, on }: { toolId: string; on: boolean }) => { await (on ? cloudService.bookmark(toolId) : cloudService.unbookmark(toolId)) },
    onMutate: async ({ toolId, on }) => {
      await client.cancelQueries({ queryKey: SAVED_KEY })
      const before = client.getQueryData<SavedList>(SAVED_KEY)
      const at = Math.floor(Date.now() / 1000)
      const placeholder: SavedMeta = { id: `pending-${toolId}`, kind: 'bookmark', toolId, title: toolId, size: 0, rev: 1, createdAt: at, updatedAt: at }
      client.setQueryData<SavedList>(SAVED_KEY, (list) => list && {
        ...list,
        items: on ? [placeholder, ...list.items] : list.items.filter((entry) => !(entry.kind === 'bookmark' && entry.toolId === toolId)),
      })
      return { before }
    },
    onError: (_error, _input, context) => { if (context?.before) client.setQueryData(SAVED_KEY, context.before) },
    onSettled: refresh,
  })
}

export function useSourceCheckHistory(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: HISTORY_KEY,
    queryFn: ({ pageParam }) => cloudService.history(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.next,
    enabled,
  })
}
