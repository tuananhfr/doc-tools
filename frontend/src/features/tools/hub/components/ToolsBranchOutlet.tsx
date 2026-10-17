import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import { ToolsBranchContext, type ToolsBranch } from '../hooks/tools-branch'
import { ExperienceControls, ExperiencePlacementContext } from './ExperienceControls'

interface ToolsBranchOutletProps {
  /** Hằng khai sẵn (`PUBLIC_TOOLS_BRANCH` / `APP_TOOLS_BRANCH`) — object mới mỗi lần render là mọi trang con render lại. */
  branch: ToolsBranch
}

/** Phần tử route bọc các trang của một nhánh, cho chúng biết đang đứng ở nhánh nào. */
export function ToolsBranchOutlet({ branch }: ToolsBranchOutletProps) {
  const [experienceTarget, setExperienceTarget] = useState<HTMLDivElement | null>(null)
  return (
    <ToolsBranchContext.Provider value={branch}>
      <ExperiencePlacementContext.Provider value={setExperienceTarget}>
        <ExperienceControls target={experienceTarget} />
        <Outlet />
      </ExperiencePlacementContext.Provider>
    </ToolsBranchContext.Provider>
  )
}
