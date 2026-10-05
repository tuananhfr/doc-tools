import { createContext, useContext } from 'react'
import { ROUTES } from '@/constants/routes'

/**
 * "Chuyện Nhỏ" có HAI nhánh route, mỗi nhánh một URL và một khung:
 * `public` (`/doc-tools`, khung khách, không cần phiên) và `app` (`/tools`,
 * trong khung ERPcons). Cùng một trang chạy ở cả hai, nên mọi link nội bộ phải
 * dựng từ `base` của nhánh đang đứng — viết cứng một gốc là người trong app bấm
 * một thẻ công cụ rồi rơi ra khung khách.
 */
export interface ToolsBranch {
  kind: 'public' | 'app'
  base: string
}

export const PUBLIC_TOOLS_BRANCH: ToolsBranch = { kind: 'public', base: ROUTES.docTools }
export const APP_TOOLS_BRANCH: ToolsBranch = { kind: 'app', base: ROUTES.tools }

export const ToolsBranchContext = createContext<ToolsBranch>(PUBLIC_TOOLS_BRANCH)

export function useToolsBranch(): ToolsBranch {
  return useContext(ToolsBranchContext)
}
