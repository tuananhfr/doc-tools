import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { ToolSearch } from '@/features/site/components/ToolSearch'
import { pickCommonTasks } from '@/features/site/utils/common-tasks'
import { useToolsBranch } from '@/features/tools/hub/hooks/tools-branch'
import { useToolCatalog } from '@/features/tools/hub/hooks/useToolCatalog'
import { toolPath } from '@/features/tools/hub/utils/tool-lookup'
import { COMMON_TASK_IDS } from '../config/landing-content'

/**
 * Ô tìm + việc thường dùng ngay màn đầu (spec v3 §05 HOME, CN-001): trước đây khách trên điện thoại phải
 * bấm "Mở công cụ" rồi mới có ô tìm. Tìm thì chuyển sang `/cong-cu?q=` để dùng chung bộ xếp hạng.
 */
export function QuickStart() {
  const { t } = useTranslation('site')
  const navigate = useNavigate()
  const { base } = useToolsBranch()
  const [keyword, setKeyword] = useState('')
  const tasks = pickCommonTasks(COMMON_TASK_IDS, useToolCatalog())
  const search = () => {
    const query = keyword.trim()
    navigate(query ? `/cong-cu?q=${encodeURIComponent(query)}` : '/cong-cu')
  }
  return (
    <div className="cn-landing-quick">
      <ToolSearch qualityTracking id="tim-trang-chu" keyword={keyword} onKeyword={setKeyword} onSubmit={search} label={t('landing.quick.title')} placeholder={t('landing.quick.placeholder')} />
      <nav className="cn-landing-quick__tasks" aria-label={t('landing.quick.common')}>
        {tasks.map((tool) => <Link key={tool.id} to={toolPath(base, tool)}><Icon name={tool.icon} />{tool.name}</Link>)}
      </nav>
    </div>
  )
}
