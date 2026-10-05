import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/constants/query-keys'
import { traceService } from '../services/trace.service'

/**
 * Tra một chuỗi vừa quét. Kết quả của một mã có thể đổi (thu hồi, thay mã)
 * nên giữ ngắn hơn mặc định — quét lại sau nửa phút là hỏi lại máy chủ.
 */
export function useTraceResolve(value: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventory.trace.resolve(value),
    queryFn: () => traceService.resolve(value),
    enabled: enabled && value.trim() !== '',
    staleTime: 30_000,
  })
}
