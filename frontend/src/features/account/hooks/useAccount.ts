import { useSyncExternalStore } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accountService } from '../services/account.service'
import type { AccountState, ProfileInput, SourceRef } from '../types/account.types'

export const ACCOUNT_QUERY_KEY = ['account', 'me'] as const

const subscribeNever = () => () => {}

/**
 * Session + plan of whoever is viewing; guests resolve to `user: null`, never an error.
 * Reads as "unknown" while hydrating: a page whose i18n namespace loads lazily hydrates after
 * `/me` has already answered, and rendering that answer would not match the server HTML.
 */
export function useMe() {
  const query = useQuery({ queryKey: ACCOUNT_QUERY_KEY, queryFn: accountService.me, staleTime: 5 * 60_000 })
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false)
  return {
    data: hydrated ? query.data : undefined,
    isError: hydrated && query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

export function useRequestCode() {
  return useMutation({ mutationFn: ({ email, locale }: { email: string; locale: string }) => accountService.requestCode(email, locale) })
}

function useStoreAccount() {
  const client = useQueryClient()
  return (state: AccountState) => client.setQueryData(ACCOUNT_QUERY_KEY, state)
}

export function useVerifyCode() {
  const store = useStoreAccount()
  return useMutation({ mutationFn: ({ email, code }: { email: string; code: string }) => accountService.verifyCode(email, code), onSuccess: store })
}

export function useUpdateProfile() {
  const store = useStoreAccount()
  return useMutation({ mutationFn: (input: ProfileInput) => accountService.updateProfile(input), onSuccess: store })
}

// Under the `account` prefix so sign-out's reset also drops it.
const MY_CONTRIBUTIONS_KEY = ['account', 'contributions'] as const

export function useMyContributions(page: number, enabled: boolean) {
  return useQuery({ queryKey: [...MY_CONTRIBUTIONS_KEY, page], queryFn: () => accountService.myContributions(page), enabled })
}

/** For forms elsewhere that file a contribution: the list must not show a minute-old snapshot. */
export function useRefreshMyContributions() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: MY_CONTRIBUTIONS_KEY })
}

export function useAddEvidence() {
  const refresh = useRefreshMyContributions()
  return useMutation({ mutationFn: ({ id, sourceRefs }: { id: string; sourceRefs: SourceRef[] }) => accountService.addEvidence(id, sourceRefs), onSuccess: refresh })
}

/** Runs `onGone` before the reset so the account page can stop treating the now-guest as someone to send to sign-in. */
export function useDeleteAccount(onGone: () => void) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (confirmEmail: string) => accountService.deleteAccount(confirmEmail),
    onSuccess: () => {
      onGone()
      return client.resetQueries({ queryKey: ['account'] })
    },
  })
}

export function useLogout() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: accountService.logout,
    // Reset (not just invalidate) so nothing from the old session lingers on a shared device; active views refetch as guest.
    onSettled: () => client.resetQueries({ queryKey: ['account'] }),
  })
}
