import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/constants/query-keys'
import { useAuthStore } from '@/store/auth.store'
import { formatNumber } from '@/utils/format'
import { TOOL_CATALOG, TOOL_FILTERS } from '../config/tool-catalog'
import { fetchToolStats } from '../services/tool-visits.service'

export interface HubStat {
  value: string
  label: string
  /** Ô này là lời mời ERPCons Pro: vẽ kèm nút "Đăng ký dùng thử" thay cho con số. */
  proOffer?: boolean
}

const READY_COUNT = TOOL_CATALOG.filter((tool) => tool.status === 'ready').length
// Bỏ mục "Tất cả" — nó không phải một nhóm.
const GROUP_COUNT = TOOL_FILTERS.length - 1

/** Dưới ngưỡng này không khoe số: "37 lượt dùng" phản tác dụng hơn không có gì. */
export const VISIT_DISPLAY_THRESHOLD = 1000

const STATS_STALE_MS = 5 * 60 * 1000

/**
 * Số liệu ở đáy hero — chỉ số THẬT, ô cuối là lời mời ERPCons Pro cho khách. Tổng lượt mở công cụ đếm ở `erp_tools`;
 * chưa tới ngưỡng, API lỗi hay đang offline thì ô đó hiện "Không giới hạn lượt
 * dùng" (cũng đúng sự thật) thay vì một con số.
 */
export function useHubStats(): HubStat[] {
  const status = useAuthStore((state) => state.status)
  // Tính cả `idle`: khách là số đông ở đây, chờ `/me` rồi mới đổi ô thì ai cũng thấy nháy.
  const signedIn = status === 'authenticated' || status === 'offline'
  const { data } = useQuery({
    queryKey: queryKeys.tools.stats(),
    queryFn: fetchToolStats,
    staleTime: STATS_STALE_MS,
    retry: false,
  })

  const total = data?.total ?? 0
  const usage: HubStat =
    total >= VISIT_DISPLAY_THRESHOLD
      ? { value: formatNumber(total), label: 'lượt dùng công cụ' }
      : { value: 'Không giới hạn', label: 'lượt dùng' }

  return [
    { value: String(READY_COUNT), label: 'công cụ sẵn dùng' },
    usage,
    signedIn
      ? { value: String(GROUP_COUNT), label: 'nhóm công cụ' }
      : { value: 'ERPCons Pro', label: 'lưu trữ, chia sẻ, duyệt cùng cả đội', proOffer: true },
  ]
}
