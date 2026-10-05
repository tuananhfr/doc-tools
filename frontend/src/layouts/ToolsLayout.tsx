import { Suspense } from 'react'
import { useParams } from 'react-router-dom'
import { Loading } from '@/components/ui'
import { PUBLIC_TOOLS_BRANCH, ToolsBranchOutlet, toolNeedsFullWidth } from '@/features/tools/hub'
import { AuthBrandPanel } from './components/AuthBrandPanel'

/**
 * Khung KHÁCH của "Chuyện Nhỏ" — nhánh công khai `/doc-tools/*`, không sidebar,
 * không dải đầu trang.
 *
 * Luôn là khung này, kể cả khi đã đăng nhập: bản trong khung app ở `/tools/*`
 * (`routes/tools.routes.tsx`). Nhờ vậy trang vẽ NGAY, không chờ `/me` — phiên
 * chỉ quyết định nút "Đăng nhập" / "Mở trong ERPcons", và nút đó do chính trang
 * vẽ (`useGuestSessionAction`: trong hero ở trang chọn, trên dải đường dẫn ở
 * trang công cụ). Không tự chuyển người đã đăng nhập sang `/tools`: `/me` trả về
 * chậm là chuyển giữa chừng, tệp vừa thả vào mất theo.
 *
 * CHIA ĐÔI như trang đăng nhập: cột ảnh bìa ERPCons (`AuthBrandPanel`, ẩn từ
 * ≤1024px) + cột công cụ. Trình chỉnh sửa PDF cần trọn bề ngang nên bỏ cột ảnh
 * bìa. `.erp-tools-guest` vẫn là VÙNG CUỘN như trước — thanh công cụ dính và các
 * script kiểm thử đều bám vào nó.
 */
export function ToolsLayout() {
  const { tool: slug } = useParams()
  const split = !toolNeedsFullWidth(slug)

  return (
    <div className={`erp-tools-frame${split ? ' erp-tools-frame--split' : ''}`}>
      {/* `null` vẫn giữ chỗ trong danh sách con: bật/tắt cột này không dựng lại cột công cụ. */}
      {split ? <AuthBrandPanel headlineTag="p" /> : null}

      <div className="erp-tools-guest">
        <main className="erp-tools-guest__main">
          <Suspense fallback={<Loading />}>
            <ToolsBranchOutlet branch={PUBLIC_TOOLS_BRANCH} />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
