import { useMe } from '@/features/account'
import { FavouriteButton } from '@/features/cloud'

/** Joins account and cloud here, so neither feature imports the other for the tool header. */
export function ToolFavourite({ toolSlug }: { toolSlug: string }) {
  const me = useMe()
  return <FavouriteButton toolId={toolSlug} pro={Boolean(me.data?.user && me.data.plan.pro)} />
}
