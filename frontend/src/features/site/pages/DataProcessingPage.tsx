import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { StateView } from '@/components/ui/StateView'
import { TOOL_CATALOG, TOOL_FILTERS } from '@/features/tools/hub/config/tool-catalog'
import { useToolsBranch } from '@/features/tools/hub/hooks/tools-branch'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import { toolPath } from '@/features/tools/hub/utils/tool-lookup'
import { FaqList } from '../components/FaqList'
import { SitePageHero } from '../components/SitePageHero'
import { ToolSearch } from '../components/ToolSearch'
import { SITE_PAGE_META } from '../config/site-pages'
import { DATA_FAQ_IDS, FAQ_ITEMS } from '../config/support-faq'
import { filterProcessingRows, PROCESSING_FILTERS, PROCESSING_LABEL, processingRows, type ProcessingFilter, type ProcessingMode } from '../utils/data-processing'
import { pickFaq } from '../utils/faq'

const GROUP_LABELS = new Map(TOOL_FILTERS.map((item) => [item.value as string, item.label]))
const ROWS = processingRows(TOOL_CATALOG, GROUP_LABELS)
const DEVICE_READY = ROWS.filter((row) => row.tool.status === 'ready' && row.mode !== 'server').length
const SERVER_SOON = ROWS.filter((row) => row.mode === 'server').length
const DATA_FAQ = pickFaq(FAQ_ITEMS, DATA_FAQ_IDS)
const MODE_ICON: Record<ProcessingMode, string> = { device: 'check-circle-fill', model: 'cpu', server: 'cloud-arrow-up' }

export default function DataProcessingPage() {
  usePageTitle(SITE_PAGE_META['xu-ly-du-lieu'].title)
  const { base } = useToolsBranch()
  const [filter, setFilter] = useState<ProcessingFilter>('all')
  const [keyword, setKeyword] = useState('')
  const rows = useMemo(() => filterProcessingRows(ROWS, filter, keyword), [filter, keyword])

  const columns = [
    {
      icon: 'laptop', tone: 'device', title: 'Xử lý ngay trên thiết bị', lead: `${DEVICE_READY} công cụ đang dùng được`,
      points: ['Tệp PDF, ảnh, video chỉ mở trong tab trình duyệt', 'Kết quả chỉ có khi bạn bấm tải về', 'Bộ nhận dạng chữ tải từ chính trang này, không qua bên thứ ba'],
    },
    {
      icon: 'cloud-arrow-up', tone: 'server', title: 'Gửi tới máy chủ của chúng tôi', lead: 'Ít nhất có thể',
      points: [
        'Tên công cụ bạn mở, để đếm tổng lượt dùng. Không cookie, không định danh bạn',
        'Địa chỉ IP chỉ được băm một chiều để chống gửi tự động, tự xoá sau khoảng 1 giờ',
        'Góp ý, đề xuất chỉ gửi khi bạn đánh dấu đồng ý và bấm Gửi',
        ...(SERVER_SOON ? [`${SERVER_SOON} công cụ sắp có sẽ cần tra cứu trên máy chủ, thẻ của chúng ghi rõ`] : []),
      ],
    },
    {
      icon: 'hdd', tone: 'local', title: 'Lưu trong trình duyệt của bạn', lead: 'Chỉ trên máy này',
      points: ['Công cụ dùng gần đây và giao diện sáng, tối', 'Dữ liệu bạn tự lưu: Lịch Gia Đình, ghi chú, nháp CV, thẻ ghi nhớ', 'Xoá bất cứ lúc nào trong công cụ hoặc trong cài đặt trình duyệt'],
    },
  ] as const

  return (
    <div className="cn-site-page cn-data">
      <SitePageHero
        id="cn-data-title"
        trail={[{ label: 'Trang chủ', to: '/' }, { label: 'Cách xử lý dữ liệu' }]}
        title={<>Cách chúng tôi <span>xử lý dữ liệu</span></>}
        tagline="Tệp của bạn ở lại trên máy bạn."
        description={<p>Chuyện Nhỏ xử lý tệp ngay trong trình duyệt. Trang này nói rõ từng công cụ chạy ở đâu, và những gì thật sự được gửi về máy chủ.</p>}
        caption={'Minh bạch\ntừng công cụ!'}
        art={<span className="cn-page-hero-icon"><Icon name="shield-lock" /></span>}
      >
        <ul className="cn-page-points">
          <li><Icon name="cookie" />Không dùng cookie</li>
          <li><Icon name="eye-slash" />Không công cụ theo dõi, quảng cáo</li>
          <li><Icon name="person-x" />Không cần tài khoản</li>
        </ul>
      </SitePageHero>

      <section className="cn-container cn-page-section" aria-label="Dữ liệu đi đâu">
        <ul className="cn-data-columns">
          {columns.map((column) => (
            <li key={column.title} className={`cn-data-column cn-data-column--${column.tone}`}>
              <Icon name={column.icon} />
              <h2>{column.title}</h2>
              <p>{column.lead}</p>
              <ul className="cn-hub-checks">{column.points.map((point) => <li key={point}><Icon name="check-circle-fill" />{point}</li>)}</ul>
            </li>
          ))}
        </ul>
      </section>

      <section className="cn-container cn-page-section" aria-labelledby="cn-data-table-title">
        <h2 id="cn-data-table-title">Từng công cụ xử lý ở đâu</h2>
        <p className="cn-section-description">Bảng sinh trực tiếp từ danh mục công cụ, nên luôn khớp với nhãn trên từng thẻ.</p>
        <div className="cn-data-toolbar">
          <ToolSearch id="tim-xu-ly" keyword={keyword} onKeyword={setKeyword} placeholder="Tìm công cụ… (ví dụ: OCR, lương, QR)" />
          <div className="cn-tool-filters cn-hub-filters" role="group" aria-label="Lọc theo nơi xử lý">
            {PROCESSING_FILTERS.map((item) => (
              <button key={item.value} type="button" className={`cn-filter${item.value === filter ? ' is-active' : ''}`} aria-pressed={item.value === filter} onClick={() => setFilter(item.value)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <p className="cn-results-count" role="status">{rows.length} công cụ</p>
        {rows.length > 0 ? (
          <div className="cn-data-table-wrap">
            <table className="cn-data-table">
              <thead><tr><th scope="col">Công cụ</th><th scope="col">Nhóm</th><th scope="col">Xử lý ở đâu</th><th scope="col">Ghi chú</th></tr></thead>
              <tbody>
                {rows.map(({ tool, group, mode, note }) => (
                  <tr key={tool.id}>
                    <th scope="row">
                      {tool.status === 'ready'
                        ? <Link to={toolPath(base, tool)}>{tool.name}</Link>
                        : <span>{tool.name} <small className="cn-soon-tag">Sắp có</small></span>}
                    </th>
                    <td data-label="Nhóm">{group}</td>
                    <td data-label="Xử lý ở đâu"><span className={`cn-processing cn-processing--${mode === 'server' ? 'server' : 'device'}`}><Icon name={MODE_ICON[mode]} />{PROCESSING_LABEL[mode]}</span></td>
                    <td data-label="Ghi chú">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <StateView icon="search" title="Không tìm thấy công cụ nào" description="Thử từ khoá khác hoặc bỏ bộ lọc." actions={<button type="button" className="cn-button" onClick={() => { setKeyword(''); setFilter('all') }}>Xem tất cả</button>} />
        )}
      </section>

      <section className="cn-container cn-page-section" aria-labelledby="cn-data-faq">
        <h2 id="cn-data-faq">Câu hỏi về dữ liệu</h2>
        <p className="cn-section-description">Đọc đầy đủ ở <Link to="/quyen-rieng-tu">Chính sách quyền riêng tư</Link>.</p>
        <FaqList items={DATA_FAQ} />
      </section>
    </div>
  )
}
