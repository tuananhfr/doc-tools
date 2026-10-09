import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { LandingDoc } from '@/features/site-landing'
import { adminService } from '../services/admin.service'
import type { LandingDetail } from '../types/admin.types'

const LANDINGS = ['admin', 'landings'] as const
const AUDIT = ['admin', 'audit'] as const
const once = { retry: false } as const

export function useLandings() { return useQuery({ queryKey: [...LANDINGS, 'list'], queryFn: adminService.landings, ...once }) }

export function useLanding(key: string) {
  // The editor keeps its own copy once loaded; a background refetch must not look like someone else's edit.
  return useQuery({ queryKey: [...LANDINGS, 'detail', key], queryFn: () => adminService.landing(key), staleTime: Infinity, ...once })
}

/** Every write answers with the fresh page, so the detail is written instead of refetched. */
function useLandingWrite<A>(run: (args: A) => Promise<LandingDetail>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: run,
    onSuccess: (landing) => {
      client.setQueryData([...LANDINGS, 'detail', landing.key], landing)
      void client.invalidateQueries({ queryKey: [...LANDINGS, 'list'] })
      void client.invalidateQueries({ queryKey: AUDIT })
    },
  })
}

export function useCreateLanding() { return useLandingWrite(({ key, name }: { key: string; name: string }) => adminService.createLanding(key, name)) }
export function useSaveLanding(key: string) {
  return useLandingWrite(({ name, draft, baseRev }: { name: string; draft: LandingDoc; baseRev: number }) => adminService.saveLanding(key, name, draft, baseRev))
}
export function usePublishLanding(key: string) { return useLandingWrite((baseRev: number) => adminService.publishLanding(key, baseRev)) }
export function useUnpublishLanding(key: string) { return useLandingWrite(() => adminService.unpublishLanding(key)) }

export function useUploadLandingAsset() {
  const client = useQueryClient()
  return useMutation({ mutationFn: adminService.uploadLandingAsset, onSuccess: () => client.invalidateQueries({ queryKey: AUDIT }) })
}
