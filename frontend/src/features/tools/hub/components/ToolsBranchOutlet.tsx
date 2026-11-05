import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import { ToolsBranchContext, type ToolsBranch } from '../hooks/tools-branch'
import { DEFAULT_EXPERIENCE_MODE } from '../utils/experience-mode'

interface ToolsBranchOutletProps {
  /** Hằng khai sẵn (`PUBLIC_TOOLS_BRANCH` / `APP_TOOLS_BRANCH`) — object mới mỗi lần render là mọi trang con render lại. */
  branch: ToolsBranch
}

/** Phần tử route bọc các trang của một nhánh, cho chúng biết đang đứng ở nhánh nào. */
export function ToolsBranchOutlet({ branch }: ToolsBranchOutletProps) {
  useEffect(() => {
    document.documentElement.dataset.experience = DEFAULT_EXPERIENCE_MODE
    return () => { delete document.documentElement.dataset.experience }
  }, [])
  return (
    <ToolsBranchContext.Provider value={branch}>
      <Outlet />
    </ToolsBranchContext.Provider>
  )
}
